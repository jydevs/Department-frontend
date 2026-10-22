import { guarded, pick, withSession } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** The API revokes every session when the password changes: the cookies of this browser are dropped as well. */
export const POST = guarded(async (req, body) => {
  const payload = pick(body, ["currentPassword", "newPassword"]);
  return withSession(
    req,
    (accessToken) => upstream("/storefront/customers/me/change-password", { method: "POST", body: payload, accessToken, req }),
    { endsSession: true, map: () => ({ message: "Contraseña actualizada. Inicia sesión de nuevo." }) },
  );
});
