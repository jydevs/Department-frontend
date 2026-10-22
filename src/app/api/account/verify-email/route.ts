import { clearSessionCookies, errorFrom, guarded, json, pick } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** The emailed link proves the mailbox and sets the (new) password; the API revokes every previous session. */
export const POST = guarded(async (req, body) => {
  const up = await upstream("/storefront/customers/verify-email", { method: "POST", body: pick(body, ["token", "password"]), req });
  if (up.status !== 200) return errorFrom(up);
  const res = json({ message: "Correo verificado." });
  clearSessionCookies(res);
  return res;
});
