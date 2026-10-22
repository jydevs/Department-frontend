import { errorFrom, fail, guarded, json } from "@/lib/account/server/bff";
import { upstream } from "@/lib/account/server/upstream";

export const dynamic = "force-dynamic";

/** Same shape the API validates (43..90 chars of base64url / dot). Anything else never leaves this server. */
const TOKEN_RE = /^[A-Za-z0-9_.-]{43,90}$/;

export const POST = guarded(async (req, body) => {
  const token = typeof body.token === "string" ? body.token : "";
  if (!TOKEN_RE.test(token)) return fail(400, "INVALID_TOKEN");
  const up = await upstream("/storefront/newsletter/confirm", { query: { token }, req });
  if (up.status !== 200) return errorFrom(up);
  return json({ status: "subscribed" });
});
