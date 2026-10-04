import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const MAX_BODY = 16 * 1024;

/** Lee el cuerpo cortando en cuanto supera MAX_BODY (la cabecera Content-Length puede faltar o mentir). */
async function readLimited(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Webhook saliente del backend tras publicar/programar/restaurar contenido.
 * Cuerpo `{ tags, ts }` firmado con HMAC-SHA256 (hex) en la cabecera `x-signature` usando
 * `STOREFRONT_REVALIDATE_SECRET` (el mismo valor en la API y aquí). Cualquier fallo → 401 sin detalles.
 */
export async function POST(req: Request) {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 401 });

  // Tope de tamaño ANTES de leer el cuerpo (50 etiquetas ≤ 100 caracteres caben de sobra en 16 KB)
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return new Response(null, { status: 413 });
  const raw = await readLimited(req);
  if (raw === null) return new Response(null, { status: 413 });
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
