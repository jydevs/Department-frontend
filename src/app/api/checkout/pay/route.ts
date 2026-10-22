import type { NextRequest } from "next/server";
import { callApi, fail, guardMutation, json, readJson } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";
import { readOrderCookie } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Payment instructions to reopen the gateway for a still-pending order (same reference), taken from the order's
 * cookie. Refuses when the order is no longer payable.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;
  const number = Number(body.number);
  if (!Number.isInteger(number) || number < 1) return fail({ code: "VALIDATION_ERROR", message: "Pedido no válido.", status: 400 });

  const cookie = await readOrderCookie(number);
  if (!cookie) return fail({ code: "ORDER_TOKEN_REQUIRED", message: "No podemos reabrir el pago desde este navegador.", status: 401 });
  const order = await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token: cookie.token } });
  if (!order.ok) return fail(order.issue);
  if (order.data.status !== "pending" || order.data.paymentStatus === "paid") {
    return fail({ code: "ORDER_NOT_PAYABLE", message: "Este pedido ya no se puede pagar.", status: 409 });
  }
  return json({ orderNumber: number, payment: cookie.payment });
}
