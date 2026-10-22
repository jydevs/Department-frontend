import { errorFrom, fail, guarded, json } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[A-Za-z0-9_.-]{43,90}$/;

/**
 * Unsubscribes with the stateless token of the emails (`<subscriber id>.<HMAC>`: reusable, it never expires).
 * POST on purpose: mail scanners that prefetch links must not unsubscribe anybody, the page asks first.
 */
export const POST = guarded(async (req, body) => {
  const token = typeof body.token === "string" ? body.token : "";
  if (!TOKEN_RE.test(token)) return fail(400, "INVALID_TOKEN");
  const up = await upstream("/storefront/newsletter/unsubscribe", { method: "POST", query: { token }, req });
  if (up.status !== 200) return errorFrom(up);
  return json({ status: "unsubscribed" });
});
