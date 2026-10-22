import { errorFrom, fail, guarded, json, pick } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Always 202 with the same message: the answer never reveals whether the email already has an account. */
export const POST = guarded(async (req, body) => {
  if (body.acceptsTerms !== true) {
    return fail(400, "VALIDATION_ERROR", { fields: { acceptsTerms: ["Debes aceptar los términos y la política de privacidad."] } });
  }
  const payload = pick(body, ["email", "password", "firstName", "lastName", "acceptsMarketing"]);
  payload.acceptsMarketing = body.acceptsMarketing === true;
  const up = await upstream("/storefront/customers/register", { method: "POST", body: payload, req });
  if (up.status !== 202) return errorFrom(up);
  return json({ message: "Si el correo es válido, te enviamos un enlace para verificarlo." }, 202);
});
