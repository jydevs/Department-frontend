import type { NextRequest } from "next/server";
import { setSessionCookies } from "@/lib/account/server/bff";
import { fail, guardMutation, json, readJson } from "@/lib/cart/server";
import { fetchOrderView, saveLastOrderCookie, saveOrderCookie } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Payment instructions to reopen the gateway for a still-pending order (same reference). They come from the API's
 * order, which only returns them while it is payable, so it works from any browser that has the order's token
 * (`token` in the body, from the tracking link) and not only from the one that checked out. Without a token, a customer
 * session opens the order from the account.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  if (!Number.isInteger(number) || number < 1) return fail({ code: "VALIDATION_ERROR", message: "Pedido no válido.", status: 400 });

  const { result: order, token, rotated } = await fetchOrderView(req, number, body.token);
  if (!order) return fail({ code: "ORDER_TOKEN_REQUIRED", message: "Necesitamos el enlace de seguimiento de tu pedido, o iniciar sesión con la cuenta que compró, para reabrir el pago.", status: 401 });
  if (!order.ok) return fail(order.issue);
  const payment = order.data.payment?.instructions;
  if (order.data.status !== "pending" || order.data.paymentStatus === "paid" || !payment) {
    return fail({ code: "ORDER_NOT_PAYABLE", message: "Este pedido ya no se puede pagar.", status: 409 });
  }
  // this browser is about to pay: remember the order so the gateway's return (which only carries `?id=`) finds it
  if (token) await saveOrderCookie(number, token);
  else await saveLastOrderCookie(number);
  const res = json({ orderNumber: number, payment });
  if (rotated) setSessionCookies(res, rotated);
  return res;
}
