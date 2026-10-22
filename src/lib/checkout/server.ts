import "server-only";
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/cart/server";

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

export async function readLastOrderNumber(): Promise<number | null> {
  const n = Number((await cookies()).get(LAST_ORDER_COOKIE)?.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The mock gateway only exists outside production and while the front is not told it uses Wompi. */
export function mockPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PAYMENT_PROVIDER !== "wompi";
}
