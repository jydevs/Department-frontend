import type { NextRequest } from "next/server";
import { callApi, fail, guardMutation, json, readJson } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";
import { orderToken } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Payment instructions to reopen the gateway for a still-pending order (same reference). They come from the API's
 * order, which only returns them while it is payable, so it works from any browser that has the order's token
 * (`token` in the body, from the tracking link) and not only from the one that checked out.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  if (!Number.isInteger(number) || number < 1) return fail({ code: "VALIDATION_ERROR", message: "Pedido no válido.", status: 400 });

  const token = await orderToken(number, body.token);
  if (!token) return fail({ code: "ORDER_TOKEN_REQUIRED", message: "Necesitamos el enlace de seguimiento de tu pedido para reabrir el pago.", status: 401 });
  const order = await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token } });
  if (!order.ok) return fail(order.issue);
  const payment = order.data.payment?.instructions;
  if (order.data.status !== "pending" || order.data.paymentStatus === "paid" || !payment) {
    return fail({ code: "ORDER_NOT_PAYABLE", message: "Este pedido ya no se puede pagar.", status: 409 });
  }
  return json({ orderNumber: number, payment });
}
