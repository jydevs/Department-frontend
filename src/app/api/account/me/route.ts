import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/account/config";
import { guarded, json, pick, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/**
 * Session probe. ALWAYS 200: `{ customer: null }` when there is no (valid) session, so a visitor with a stale cookie
 * never produces a failing request in the browser console. Renews the access token transparently when needed.
 */
export const GET = guarded(async (req) => {
  if (!req.cookies.get(ACCESS_COOKIE)?.value && !req.cookies.get(REFRESH_COOKIE)?.value) return json({ customer: null });

  const res = await withSession(req, (accessToken) => upstream("/storefront/customers/me", { accessToken, req }), {
    map: (customer) => ({ customer }),
  });
  if (res.status !== 401) return res;

  // expired / revoked session: same answer as "no session", keeping the cookie clearing of the 401
  const anonymous = json({ customer: null });
  for (const cookie of res.cookies.getAll()) anonymous.cookies.set(cookie);
  return anonymous;
});

export const PATCH = guarded(async (req, body) => {
  const payload = pick(body, ["firstName", "lastName", "phone", "acceptsMarketing"]);
  return withSession(req, (accessToken) => upstream("/storefront/customers/me", { method: "PATCH", body: payload, accessToken, req }), {
    map: (customer) => ({ customer }),
  });
});

/** Deletes (anonymises) the account; needs the password. The session ends with it. */
export const DELETE = guarded(async (req, body) => {
  const payload = pick(body, ["password"]);
  return withSession(req, (accessToken) => upstream("/storefront/customers/me", { method: "DELETE", body: payload, accessToken, req }), {
    endsSession: true,
    map: () => ({ message: "Tu cuenta fue eliminada." }),
  });
});
