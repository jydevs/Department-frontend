import type { NextRequest } from "next/server";
import { addLine, readCart } from "@/lib/cart/bff";
import { callApi, fail, guardMutation, json, readJson } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";
import { orderToken } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Puts the lines of an order that was not paid (cancelled / expired / declined) back into a cart. The lines come from
 * the API's order (token from the tracking link or this browser's cookie), so it works from any browser. Skips what is
 * out of stock.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  const token = Number.isInteger(number) && number > 0 ? await orderToken(number, body.token) : null;
  const notFound = fail({ code: "NOT_FOUND", message: "No pudimos recuperar los productos de ese pedido.", status: 404 });
  if (!token) return notFound;

  const order = await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token } });
  if (!order.ok) return order.issue.status === 404 ? notFound : fail(order.issue);
  if (order.data.paymentStatus === "paid") return fail({ code: "ORDER_ALREADY_PAID", message: "Este pedido ya está pagado.", status: 409 });
  const lines = order.data.lines.filter((l): l is typeof l & { variantId: string } => Boolean(l.variantId));
  if (lines.length === 0) return notFound;

  let skipped = 0;
  for (const line of lines) {
    const res = await addLine(req, line.variantId, Math.min(20, Math.max(1, line.quantity)));
    if (res.status >= 400) skipped++;
  }
  const cart = await readCart(req);
  return json({ cart, skipped });
}
