import { errorFrom, guarded, json } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/**
 * Newsletter sign-up (footer form). Goes through the server so the API rate-limits per visitor and the browser needs
 * no CORS. Double opt-in: the API emails a confirmation link (/newsletter/confirmar?token=…).
 */
export const POST = guarded(async (req, body) => {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const up = await upstream("/storefront/newsletter", { method: "POST", body: { email, source: "footer" }, req });
  if (up.status !== 202) return errorFrom(up);
  return json({ accepted: true }, 202);
});
