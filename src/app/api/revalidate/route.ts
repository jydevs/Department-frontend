import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * Webhook saliente del backend tras publicar/programar/restaurar contenido.
 * Cuerpo `{ tags, ts }` firmado con HMAC-SHA256 (hex) en la cabecera `x-signature` usando
 * `STOREFRONT_REVALIDATE_SECRET` (el mismo valor en la API y aquí). Cualquier fallo → 401 sin detalles.
 */
export async function POST(req: Request) {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 401 });

  const raw = await req.text(); // el HMAC se calcula sobre el cuerpo CRUDO
  const signature = req.headers.get("x-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response(null, { status: 401 });

  let body: { tags?: unknown; ts?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return new Response(null, { status: 401 });
  }
  if (typeof body.ts !== "number" || Math.abs(Date.now() - body.ts) > 5 * 60_000) return new Response(null, { status: 401 }); // anti-replay
  if (!Array.isArray(body.tags) || body.tags.length > 50 || body.tags.some((t) => typeof t !== "string" || t.length === 0 || t.length > 100)) {
    return new Response(null, { status: 400 });
  }
  // `{ expire: 0 }`: expiración inmediata (la siguiente petición ya ve el contenido nuevo)
  for (const tag of body.tags as string[]) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: body.tags });
}
