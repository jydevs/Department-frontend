import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { optionalSession, type SessionTokens } from "@/lib/account/server/bff";
import { callApi, cookieOptions, type ApiResult } from "@/lib/cart/server";
import type { OrderView } from "@/lib/cart/types";

/**
 * The order's access token (returned by the API when the order is created) lives in a short httpOnly cookie
 * `dept_order_<n>`, never in localStorage. The tracking link (`/orders/<n>?token=…`) carries the same token, so the
 * order page works from any browser: the lines to put back in a cart and the payment instructions to retry come
 * from the API's order, not from this cookie. `dept_last_order` says which order the result page is about when the
 * gateway returns without telling us (Wompi only appends `?id=<transaction>`).
 */

export const ORDER_COOKIE_PREFIX = "dept_order_";
export const LAST_ORDER_COOKIE = "dept_last_order";
const ORDER_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;
export const ORDER_TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

export async function saveOrderCookie(orderNumber: number, token: string): Promise<void> {
  const jar = await cookies();
  jar.set(`${ORDER_COOKIE_PREFIX}${orderNumber}`, token, cookieOptions(ORDER_MAX_AGE_SECONDS));
  jar.set(LAST_ORDER_COOKIE, String(orderNumber), cookieOptions(ORDER_MAX_AGE_SECONDS));
}

async function readOrderToken(orderNumber: number): Promise<string | null> {
  const raw = (await cookies()).get(`${ORDER_COOKIE_PREFIX}${orderNumber}`)?.value;
  return raw && ORDER_TOKEN_RE.test(raw) ? raw : null;
}

/** The order's token: the one in the request (tracking link) wins, otherwise this browser's cookie. */
export async function orderToken(orderNumber: number, fromRequest: unknown): Promise<string | null> {
  if (typeof fromRequest === "string" && ORDER_TOKEN_RE.test(fromRequest)) return fromRequest;
  return readOrderToken(orderNumber);
}

/** Only remembers which order this browser is paying (a customer session reads it without a token). */
export async function saveLastOrderCookie(orderNumber: number): Promise<void> {
  (await cookies()).set(LAST_ORDER_COOKIE, String(orderNumber), cookieOptions(ORDER_MAX_AGE_SECONDS));
}

/**
 * The order as the shop shows it, from the access token of the tracking link / cookie or, without one, from the
 * logged-in customer's own orders (same shape: lines with variant ids, payment instructions while payable, reservation).
 * `token` is the one that opened it (null when the customer's session did); `rotated` holds new session tokens the
 * caller must put on its response.
 */
export async function fetchOrderView(
  req: NextRequest,
  number: number,
  fromRequest: unknown,
): Promise<{ result: ApiResult<OrderView> | null; token: string | null; rotated: SessionTokens | null }> {
  const token = await orderToken(number, fromRequest);
  if (token) return { result: await callApi<OrderView>(req, "GET", `/storefront/orders/${number}`, { query: { token } }), token, rotated: null };
  const session = await optionalSession(req);
  if (!session.accessToken) return { result: null, token: null, rotated: null };
  const result = await callApi<OrderView>(req, "GET", `/storefront/customers/me/orders/${number}`, { accessToken: session.accessToken });
  return { result, token: null, rotated: session.rotated };
}

export async function readLastOrderNumber(): Promise<number | null> {
  const n = Number((await cookies()).get(LAST_ORDER_COOKIE)?.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The mock gateway only exists outside production and while the front is not told it uses Wompi. */
export function mockPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PAYMENT_PROVIDER !== "wompi";
}
