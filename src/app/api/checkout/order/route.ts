import type { NextRequest } from "next/server";
import { callApi, fail, json } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";
import { readLastOrderNumber, readOrderCookie } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Status of an order. `?number=` picks the order (default: the one this browser checked out last); the access token
 * comes from the httpOnly cookie, or from `?token=` (the tracking link). `canRetry` tells the page it can reopen
 * the payment (the cookie still holds the instructions).
 */
export async function GET(req: NextRequest) {
  const asked = Number(req.nextUrl.searchParams.get("number"));
  const number = Number.isInteger(asked) && asked > 0 ? asked : await readLastOrderNumber();
  if (!number) return fail({ code: "NOT_FOUND", message: "No encontramos un pedido reciente en este navegador.", status: 404 });

  const cookie = await readOrderCookie(number);
  const tokenParam = req.nextUrl.searchParams.get("token");
  const token = tokenParam && /^[A-Za-z0-9_-]{20,128}$/.test(tokenParam) ? tokenParam : cookie?.token;
  if (!token) return fail({ code: "ORDER_TOKEN_REQUIRED", message: "Necesitamos el enlace de seguimiento de tu pedido o que inicies sesión para verlo.", status: 401 });

  const result = await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token } });
  if (!result.ok) {
    if (result.issue.status === 404) {
      return fail({ code: "NOT_FOUND", message: "No encontramos ese pedido o el enlace ya no es válido.", status: 404 });
    }
    return fail(result.issue);
  }
  return json({ order: result.data, canRetry: Boolean(cookie), hasLines: (cookie?.lines.length ?? 0) > 0 });
}
