import "server-only";
import type { NextResponse } from "next/server";
import { issueFrom } from "./messages";
import {
  callApi,
  cartStateFrom,
  clearCartCookie,
  fail,
  isCartGone,
  json,
  readCartCookie,
  writeCartCookie,
  type ApiCartResponse,
  type ApiResult,
  type CartCookie,
} from "./server";
import { EMPTY_CART_STATE, type CartState } from "./types";

/** `{ cart: CartState }` or an error response, after a call on the visitor's cart. Clears a dead cart cookie. */
async function settle(result: ApiResult<ApiCartResponse>): Promise<NextResponse> {
  if (result.ok) return json({ cart: cartStateFrom(result.data) });
  if (isCartGone(result.issue)) {
    await clearCartCookie();
    // the visitor's cart no longer exists: report it as an empty cart plus the reason, so the UI can resync
    return fail({ ...issueFrom("CART_EXPIRED", 410), details: { reset: true } });
  }
  return fail(result.issue);
}

/** Calls the visitor's cart. Without a cart cookie there is nothing to act on (410, UI resyncs to empty). */
export async function onCart(
  req: Request,
  method: string,
  subpath: string,
  body?: unknown,
): Promise<NextResponse> {
  const cart = await readCartCookie();
  if (!cart) return fail({ ...issueFrom("CART_EXPIRED", 410), details: { reset: true } });
  return settle(await callApi<ApiCartResponse>(req, method, `/storefront/carts/${cart.id}${subpath}`, { cartToken: cart.token, body }));
}

/** The visitor's cart cookie, creating the cart (and the cookie) on first use. */
export async function ensureCart(req: Request): Promise<CartCookie | NextResponse> {
  const existing = await readCartCookie();
  if (existing) return existing;
  return createCart(req);
}

export async function createCart(req: Request): Promise<CartCookie | NextResponse> {
  const created = await callApi<{ id: string; token: string }>(req, "POST", "/storefront/carts");
  if (!created.ok) return fail(created.issue);
  const cart = { id: created.data.id, token: created.data.token };
  await writeCartCookie(cart); // the token is only returned ONCE: this is the only copy
  return cart;
}

/** Adds a line, replacing a stale cart (expired / converted) with a fresh one once. */
export async function addLine(req: Request, variantId: string, quantity: number): Promise<NextResponse> {
  let cart = await ensureCart(req);
  if (cart instanceof Response) return cart; // NextResponse
  let result = await callApi<ApiCartResponse>(req, "POST", `/storefront/carts/${cart.id}/lines`, {
    cartToken: cart.token,
    body: { variantId, quantity },
  });
  if (!result.ok && isCartGone(result.issue)) {
    await clearCartCookie();
    const fresh = await createCart(req);
    if (fresh instanceof Response) return fresh;
    cart = fresh;
    result = await callApi<ApiCartResponse>(req, "POST", `/storefront/carts/${cart.id}/lines`, {
      cartToken: cart.token,
      body: { variantId, quantity },
    });
  }
  return settle(result);
}

/** Optional shipping destination: with it the API quotes the cart with the shipping (and the tax over it). */
export interface QuoteQuery {
  shippingRateId?: string;
  department?: string;
  email?: string;
}

/**
 * Reads the visitor's cart (optionally quoted with shipping). A cart the API reports as `converted` is already an
 * order: its cookie is dropped here, so the visitor never keeps acting on it, and an empty cart comes back.
 */
export async function readCartResult(req: Request, quote: QuoteQuery = {}): Promise<ApiResult<CartState>> {
  const cart = await readCartCookie();
  if (!cart) return { ok: true, status: 200, data: EMPTY_CART_STATE };
  const { email, ...query } = quote;
  const result = await callApi<ApiCartResponse>(req, "GET", `/storefront/carts/${cart.id}`, { cartToken: cart.token, query, quoteEmail: email });
  if (!result.ok) {
    if (isCartGone(result.issue)) {
      await clearCartCookie();
      return { ok: true, status: 200, data: EMPTY_CART_STATE };
    }
    return result;
  }
  if (result.data.converted) {
    await clearCartCookie();
    return { ok: true, status: 200, data: { ...EMPTY_CART_STATE, converted: true } };
  }
  return { ok: true, status: result.status, data: cartStateFrom(result.data) };
}

export async function readCart(req: Request): Promise<CartState> {
  const result = await readCartResult(req);
  return result.ok ? result.data : EMPTY_CART_STATE;
}
