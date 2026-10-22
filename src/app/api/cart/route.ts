import type { NextRequest } from "next/server";
import { addLine, onCart } from "@/lib/cart/bff";
import { issueFrom } from "@/lib/cart/messages";
import {
  badRequest,
  callApi,
  cartStateFrom,
  clearCartCookie,
  fail,
  guardMutation,
  isCartGone,
  isUuid,
  json,
  readCartCookie,
  readJson,
  type ApiCartResponse,
} from "@/lib/cart/server";
import { EMPTY_CART_STATE } from "@/lib/cart/types";

export const dynamic = "force-dynamic";

/** The visitor's cart with the server's quote. No cart yet → an empty one (no API call, no cart created). */
export async function GET(req: NextRequest) {
  const cart = await readCartCookie();
  if (!cart) return json({ cart: EMPTY_CART_STATE });
  const result = await callApi<ApiCartResponse>(req, "GET", `/storefront/carts/${cart.id}`, { cartToken: cart.token });
  if (result.ok) return json({ cart: cartStateFrom(result.data) });
  if (isCartGone(result.issue)) {
    await clearCartCookie();
    return json({ cart: EMPTY_CART_STATE });
  }
  return fail(result.issue);
}

function quantityOf(value: unknown, min: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= 20 ? value : null;
}

/** Adds `quantity` units of a variant (creates the cart on first use). */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const quantity = quantityOf(body.quantity, 1);
  if (!isUuid(body.variantId) || quantity === null) return badRequest("Producto o cantidad no válidos.");
  return addLine(req, body.variantId, quantity);
}

/** Sets the quantity of a line (0 removes it). */
export async function PATCH(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const quantity = quantityOf(body.quantity, 0);
  if (!isUuid(body.variantId) || quantity === null) return badRequest("Producto o cantidad no válidos.");
  return onCart(req, "PATCH", `/lines/${body.variantId}`, { quantity });
}

/** `{ variantId }` removes that line; with no variant it deletes the whole cart. */
export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  if (body.variantId === undefined) {
    const cart = await readCartCookie();
    if (cart) {
      const result = await callApi<void>(req, "DELETE", `/storefront/carts/${cart.id}`, { cartToken: cart.token });
      if (!result.ok && !isCartGone(result.issue)) return fail(result.issue);
      await clearCartCookie();
    }
    return json({ cart: EMPTY_CART_STATE });
  }
  if (!isUuid(body.variantId)) return fail(issueFrom("VALIDATION_ERROR", 400));
  return onCart(req, "DELETE", `/lines/${body.variantId}`);
}
