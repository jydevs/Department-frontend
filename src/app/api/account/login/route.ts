import { errorFrom, fail, guarded, json, pick, setSessionCookies } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Logs in on the API and keeps the tokens ONLY in httpOnly cookies; the browser gets the profile, never a token. */
export const POST = guarded(async (req, body) => {
  const up = await upstream("/storefront/customers/login", { method: "POST", body: pick(body, ["email", "password"]), req });
  const data = (up.body ?? {}) as { accessToken?: unknown; expiresIn?: unknown; customer?: unknown };
  if (up.status !== 200 || typeof data.accessToken !== "string" || !up.refreshCookie) {
    return up.status === 200 ? fail(503, "SERVICE_UNAVAILABLE") : errorFrom(up);
  }
  const res = json({ customer: data.customer });
  setSessionCookies(res, {
    accessToken: data.accessToken,
    expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : 900,
    refreshToken: up.refreshCookie,
  });
  return res;
});
