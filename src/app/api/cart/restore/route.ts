import type { NextRequest } from "next/server";
import { addLine, readCart } from "@/lib/cart/bff";
import { setSessionCookies } from "@/lib/account/server/bff";
import { fail, guardMutation, json, readJson } from "@/lib/cart/server";
import { fetchOrderView } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Puts the lines of an order that was not paid (cancelled / expired / declined) back into a cart. The lines come from
 * the API's order (token from the tracking link or this browser's cookie, or the customer's session), so it works from
 * any browser. A variant the
 * cart already has is left as it is (pressing the button twice never doubles quantities) and what cannot be added
 * (out of stock, gone) comes back in `skipped` so the page can say which products are missing.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  const notFound = fail({ code: "NOT_FOUND", message: "No pudimos recuperar los productos de ese pedido.", status: 404 });
  if (!Number.isInteger(number) || number < 1) return notFound;
  const { result: order, rotated } = await fetchOrderView(req, number, body.token);
  if (!order) return notFound;
  if (!order.ok) return order.issue.status === 404 ? notFound : fail(order.issue);
  if (order.data.paymentStatus === "paid") return fail({ code: "ORDER_ALREADY_PAID", message: "Este pedido ya está pagado.", status: 409 });
  const lines = order.data.lines.filter((l): l is typeof l & { variantId: string } => Boolean(l.variantId));
  if (lines.length === 0) return notFound;

  const inCart = new Set((await readCart(req)).lines.map((l) => l.variantId));
  const skipped: { title: string; variantTitle: string }[] = [];
  for (const line of lines) {
    if (inCart.has(line.variantId)) continue;
    const res = await addLine(req, line.variantId, Math.min(20, Math.max(1, line.quantity)));
    if (res.status >= 400) skipped.push({ title: line.title, variantTitle: line.variantTitle });
    else inCart.add(line.variantId);
  }
  const cart = await readCart(req);
  const res = json({ cart, skipped });
  if (rotated) setSessionCookies(res, rotated);
  return res;
}
