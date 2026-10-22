import type { NextRequest } from "next/server";
import { hasSessionCookie, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";
import { callApi, fail, json } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";
import { orderToken, readLastOrderNumber } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/** `canRetry` / `hasLines` tell the page it can reopen the payment / put the lines back in a cart. */
function orderPayload(order: OrderView) {
  return { order, canRetry: Boolean(order.payment?.instructions), hasLines: order.lines.some((l) => l.variantId) };
}

/**
 * Status of an order. `?number=` picks the order (default: the one this browser checked out last); the access token
 * comes from `?token=` (the tracking link, valid from any browser) or from the httpOnly cookie. `canRetry` and
 * `hasLines` tell the page it can reopen the payment / put the lines back in a cart; both come from the order itself.
 * Without a token but with a customer session, the order is read from the customer's own orders (`/me/orders/:n`),
 * which carries the same payment instructions, variant ids and reservation: the page can retry the payment too.
 */
export async function GET(req: NextRequest) {
  const asked = Number(req.nextUrl.searchParams.get("number"));
  const number = Number.isInteger(asked) && asked > 0 ? asked : await readLastOrderNumber();
  if (!number) return fail({ code: "NOT_FOUND", message: "No encontramos un pedido reciente en este navegador.", status: 404 });

  const token = await orderToken(number, req.nextUrl.searchParams.get("token"));
  if (!token) {
    if (hasSessionCookie(req)) {
      return withSession(req, (accessToken) => upstream(`/storefront/customers/me/orders/${number}`, { accessToken, req }), {
        map: (body) => orderPayload(body as OrderView),
      });
    }
    return fail({
      code: "ORDER_TOKEN_REQUIRED",
      message: "Abre el enlace de seguimiento desde el mismo navegador en el que hiciste la compra, o inicia sesión con la cuenta con la que compraste.",
      status: 401,
    });
  }

  const result = await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token } });
  if (!result.ok) {
    if (result.issue.status === 404) {
      return fail({ code: "NOT_FOUND", message: "No encontramos ese pedido o el enlace ya no es válido.", status: 404 });
    }
    return fail(result.issue);
  }
  return json(orderPayload(result.data));
}
