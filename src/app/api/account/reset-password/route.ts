import { clearSessionCookies, errorFrom, guarded, json, pick } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Sets a new password with the emailed token. The API revokes every session, so the cookies of this browser go too. */
export const POST = guarded(async (req, body) => {
  const up = await upstream("/storefront/customers/reset-password", { method: "POST", body: pick(body, ["token", "password"]), req });
  if (up.status !== 200) return errorFrom(up);
  const res = json({ message: "Contraseña actualizada." });
  clearSessionCookies(res);
  return res;
});
