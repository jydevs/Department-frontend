import { errorFrom, guarded, json, pick } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Always 202 and the same message: it never reveals whether the account exists. */
export const POST = guarded(async (req, body) => {
  const up = await upstream("/storefront/customers/forgot-password", { method: "POST", body: pick(body, ["email"]), req });
  if (up.status !== 202) return errorFrom(up);
  return json({ message: "Si existe una cuenta con ese correo, te enviamos instrucciones." }, 202);
});
