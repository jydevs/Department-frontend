import type { NextRequest } from "next/server";
import { clearCartCookie, callApi, fail, isCartGone, json, readCartCookie } from "@/lib/cart/server";
import { issueFrom } from "@/lib/cart/messages";
import type { ShippingOption } from "@/lib/cart/types";

export const dynamic = "force-dynamic";

/**
 * Shipping options for the visitor's cart and a destination department. The API prices them for THIS cart
 * (free over a threshold, free by a free-shipping discount).
 */
export async function GET(req: NextRequest) {
  const department = req.nextUrl.searchParams.get("department")?.trim() ?? "";
  if (department.length < 1 || department.length > 60) {
    return fail({ code: "VALIDATION_ERROR", message: "Elige un departamento.", status: 400 });
  }
  const cart = await readCartCookie();
  if (!cart) return fail({ ...issueFrom("CART_EXPIRED", 410), details: { reset: true } });
  const result = await callApi<ShippingOption[]>(req, "GET", "/storefront/shipping-rates", {
    cartToken: cart.token,
    query: { department, cartId: cart.id },
  });
  if (result.ok) return json({ rates: result.data });
  if (isCartGone(result.issue)) {
    await clearCartCookie();
    return fail({ ...issueFrom("CART_EXPIRED", 410), details: { reset: true } });
  }
  return fail(result.issue);
}
