import "server-only";
import { cookies } from "next/headers";
import { cookieOptions } from "@/lib/cart/server";
import type { PaymentInstructions } from "@/lib/cart/types";

/**
 * The order's access token (returned by the API when the order is created) lives in a short httpOnly cookie
 * `dept_order_<n>`, never in localStorage. It also keeps what is needed to open the payment page again (the
 * gateway instructions are not secret: they travel in the gateway URL) and the cart lines, so a failed / expired
 * order can be turned back into a cart. `dept_last_order` says which order the result page is about when the
 * gateway returns without telling us (Wompi only appends `?id=<transaction>`).
 */

export const ORDER_COOKIE_PREFIX = "dept_order_";
export const LAST_ORDER_COOKIE = "dept_last_order";
const ORDER_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

export interface OrderCookie {
  token: string;
  payment: PaymentInstructions;
  /** [variantId, quantity] of the cart that became this order */
  lines: [string, number][];
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

export async function saveOrderCookie(orderNumber: number, value: OrderCookie): Promise<void> {
  const jar = await cookies();
  const lines = value.lines.slice(0, 25);
  jar.set(`${ORDER_COOKIE_PREFIX}${orderNumber}`, encode({ ...value, lines }), cookieOptions(ORDER_MAX_AGE_SECONDS));
  jar.set(LAST_ORDER_COOKIE, String(orderNumber), cookieOptions(ORDER_MAX_AGE_SECONDS));
}

export async function readOrderCookie(orderNumber: number): Promise<OrderCookie | null> {
  const raw = (await cookies()).get(`${ORDER_COOKIE_PREFIX}${orderNumber}`)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OrderCookie;
    if (typeof v.token !== "string" || !TOKEN_RE.test(v.token) || !v.payment || typeof v.payment.reference !== "string") return null;
    return { token: v.token, payment: v.payment, lines: Array.isArray(v.lines) ? v.lines : [] };
  } catch {
    return null;
  }
}

export async function readLastOrderNumber(): Promise<number | null> {
  const n = Number((await cookies()).get(LAST_ORDER_COOKIE)?.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function dropOrderCookie(orderNumber: number): Promise<void> {
  const jar = await cookies();
  jar.set(`${ORDER_COOKIE_PREFIX}${orderNumber}`, "", { ...cookieOptions(0), maxAge: 0 });
}

/** The mock gateway only exists outside production and while the front is not told it uses Wompi. */
export function mockPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_PAYMENT_PROVIDER !== "wompi";
}
