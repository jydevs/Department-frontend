import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { API_URL_PUBLIC, API_URL_SERVER } from "@/lib/api/config";
import { SITE_URL } from "@/lib/site";

interface OgOptions {
  /** file inside public/images, e.g. "home-hero.jpg" */
  photo: string;
  kicker?: string;
  title: string;
  subtitle?: string;
}

const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const MAX_BYTES = 3 * 1024 * 1024;
// Satori (next/og) solo decodifica PNG/JPEG/GIF: un WebP/AVIF rompería el render (500) en vez de salir sin foto,
// así que esos formatos se descartan y la tarjeta sale sin foto.
const IMAGE_TYPE = /^image\/(png|jpeg|gif)$/;
const MAGIC: Record<string, number[]> = { "image/png": [0x89, 0x50, 0x4e, 0x47], "image/jpeg": [0xff, 0xd8, 0xff], "image/gif": [0x47, 0x49, 0x46, 0x38] };

/** Orígenes de los que se aceptan fotos remotas: la API (medios), su URL interna y el propio sitio. */
const ALLOWED_ORIGINS = new Set([API_URL_PUBLIC, API_URL_SERVER, SITE_URL].map((u) => new URL(u).origin));

/** Descarga acotada (allowlist, sin redirecciones, 3 s, 3 MB, solo imágenes raster). Devuelve null ante cualquier fallo. */
async function fetchRemotePhoto(photo: string): Promise<string | null> {
  const url = new URL(photo);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !ALLOWED_ORIGINS.has(url.origin)) return null;
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(3000), cache: "no-store" });
  if (!res.ok || !res.body) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPE.test(type)) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  if (!MAGIC[type].every((b, i) => bytes[i] === b)) return null; // el content-type no coincide con el contenido
  return `data:${type};base64,${bytes.toString("base64")}`;
}

/** `photo` = archivo de public/images, o URL absoluta (medios de la API). Si no se puede leer, la tarjeta sale sin foto. */
async function photoDataUrl(photo: string): Promise<string> {
  try {
    if (/^https?:\/\//i.test(photo)) return (await fetchRemotePhoto(photo)) ?? BLANK;
    // solo el nombre de archivo dentro de public/images (sin subir de directorio)
    const name = path.basename(photo.replace(/^\/?images\//, ""));
    if (!name || !/\.(jpe?g|png)$/i.test(name)) return BLANK;
    const file = await readFile(path.join(process.cwd(), "public", "images", name));
    const mime = /\.png$/i.test(name) ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${file.toString("base64")}`;
  } catch {
    return BLANK;
  }
}

/** 1200×630 social card: cropped photo, dark falloff, big uppercase headline. */
export async function renderOg({ photo, kicker, title, subtitle }: OgOptions) {
  const src = await photoDataUrl(photo);

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori (ImageResponse) needs a plain <img> */}
        <img
          src={src}
          alt=""
          width={1200}
          height={1800}
          style={{ position: "absolute", top: -420, left: 0, width: 1200, height: 1800, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 56, display: "flex", flexDirection: "column" }}>
          {kicker ? (
            <div style={{ display: "flex", alignItems: "center", color: "#ffffff", fontSize: 24, letterSpacing: 6, textTransform: "uppercase", opacity: 0.85 }}>
              <div style={{ width: 56, height: 3, background: "#e10e0e", marginRight: 18 }} />
              {kicker}
            </div>
          ) : null}
          <div style={{ display: "flex", color: "#ffffff", fontSize: 92, fontWeight: 800, lineHeight: 0.95, textTransform: "uppercase", marginTop: 18 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", color: "#ffffff", fontSize: 30, marginTop: 16, opacity: 0.8 }}>{subtitle}</div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
