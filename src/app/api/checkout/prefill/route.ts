import type { NextRequest } from "next/server";
import { json, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/account/config";

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Optional checkout prefill. Reads the customer straight from the API through the account BFF helper (`withSession`),
 * so a refresh-token rotation is single-flight and its new cookies reach the browser (no internal fetch, no origin
 * taken from the request). ALWAYS answers 200: `{ customer: null }` when there is no session or the account area is
 * unavailable, so the browser console never shows a failing request.
 */
export async function GET(req: NextRequest) {
  if (!req.cookies.get(ACCESS_COOKIE)?.value && !req.cookies.get(REFRESH_COOKIE)?.value) return json({ customer: null });
  try {
    const res = await withSession(req, (accessToken) => upstream("/storefront/customers/me", { accessToken, req }), {
      map: (body) => {
        const c = body as Record<string, unknown> | null;
        if (!c || typeof c.email !== "string") return { customer: null };
        return { customer: { email: c.email, firstName: str(c.firstName), lastName: str(c.lastName), phone: str(c.phone) } };
      },
    });
    if (res.ok) return res;
    // expired / unavailable: anonymous answer, keeping any Set-Cookie (rotated or cleared session)
    const anonymous = json({ customer: null });
    for (const cookie of res.cookies.getAll()) anonymous.cookies.set(cookie);
    return anonymous;
  } catch {
    return json({ customer: null });
  }
}
