import { clearSessionCookies, guarded, json } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";
import { REFRESH_COOKIE } from "@/lib/account/config";

export const dynamic = "force-dynamic";

/** Revokes the session on the API (best effort) and always drops the cookies: logout never fails for the visitor. */
export const POST = guarded(async (req) => {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) await upstream("/storefront/customers/logout", { method: "POST", refreshToken, req });
  const res = json({ message: "Sesión cerrada." });
  clearSessionCookies(res);
  return res;
});
