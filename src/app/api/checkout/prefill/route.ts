import type { NextRequest } from "next/server";
import { json } from "@/lib/cart/server";

export const dynamic = "force-dynamic";

const SESSION_COOKIES = ["dept_at", "dept_rt_c"];

/**
 * Optional checkout prefill. Asks the account area (`/api/account/me`, built apart) who the visitor is, from the
 * server, only when a session cookie exists. ALWAYS answers 200: `{ customer: null }` when there is no session or the
 * account area is unavailable, so the browser console never shows a failing request.
 */
export async function GET(req: NextRequest) {
  if (!SESSION_COOKIES.some((name) => req.cookies.get(name)?.value)) return json({ customer: null });
  try {
    const res = await fetch(new URL("/api/account/me", req.nextUrl.origin), {
      headers: { cookie: req.headers.get("cookie") ?? "", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return json({ customer: null });
    const data = (await res.json()) as { customer?: Record<string, unknown> | null };
    const c = data.customer;
    if (!c || typeof c.email !== "string") return json({ customer: null });
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    return json({ customer: { email: c.email, firstName: str(c.firstName), lastName: str(c.lastName), phone: str(c.phone) } });
  } catch {
    return json({ customer: null });
  }
}
