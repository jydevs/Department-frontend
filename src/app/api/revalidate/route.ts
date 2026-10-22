import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * Signed webhook from the backend (RevalidationService): after content is published / restored the API
 * POSTs `{ "tags": [...], "ts": <ms> }` here with `x-signature` = hex HMAC-SHA256 of the RAW body keyed with
 * STOREFRONT_REVALIDATE_SECRET (same value on both sides).
 *
 * Any failure answers 401 with an empty body (no hint about which check failed).
 */

const MAX_SKEW_MS = 5 * 60_000;
const MAX_TAGS = 100;
const MAX_BODY_BYTES = 64 * 1024;
/** content:<kind>:<key> · content:pages · redirects (catalogue tags are not pushed by the backend) */
const TAG_FORMAT = /^(content:[a-z]+:[a-z0-9:_-]+|redirects|content:pages)$/;

function unauthorized(): Response {
  return new Response(null, { status: 401 });
}

function signatureMatches(raw: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  // without a configured secret the endpoint is closed (never "open by default")
  if (!secret) return unauthorized();

  // refuse oversized bodies BEFORE reading them (a missing / invalid length is checked again after reading)
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return unauthorized();
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return unauthorized();
  const signature = req.headers.get("x-signature") ?? "";
  if (!signatureMatches(raw, signature, secret)) return unauthorized();

  let body: { tags?: unknown; ts?: unknown };
  try {
    body = JSON.parse(raw) as { tags?: unknown; ts?: unknown };
  } catch {
    return unauthorized();
  }

  const { tags, ts } = body;
  if (typeof ts !== "number" || !Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return unauthorized();
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    tags.some((t) => typeof t !== "string" || t.length > 100 || !TAG_FORMAT.test(t))
  ) {
    return unauthorized();
  }

  // expire: 0 → the next request already sees the new content (no stale-while-revalidate window)
  for (const tag of tags as string[]) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tags.length });
}
