import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isTrustedMediaUrl } from "@/lib/api/media";

interface OgOptions {
  /** `/images/x.jpg` (public/) or a file of the media origin (`/media/...`); missing / unreadable → plain black card */
  photo?: string | null;
  kicker?: string;
  title: string;
  subtitle?: string;
}

const MAX_REMOTE_BYTES = 2 * 1024 * 1024;

/** Reads the photo as a JPEG/PNG data URI (satori can't decode WebP/AVIF), or null. */
async function loadPhoto(photo: string | null | undefined): Promise<string | null> {
  if (!photo) return null;
  try {
    if (photo.startsWith("/")) {
      // local file of this app; the resolved path must stay inside public/
      const publicDir = path.join(process.cwd(), "public");
      const file = path.resolve(publicDir, `.${photo}`);
      if (!file.startsWith(publicDir + path.sep)) return null;
      const ext = path.extname(file).toLowerCase();
      if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") return null;
      const bytes = await readFile(file);
      return `data:${ext === ".png" ? "image/png" : "image/jpeg"};base64,${bytes.toString("base64")}`;
    }
    // only files of the media origin (the same host next.config allows for next/image), never an arbitrary CMS URL
    const url = new URL(photo);
    if (!isTrustedMediaUrl(photo) || !url.pathname.startsWith("/media/")) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error", next: { revalidate: 3600 } });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !res.body || (type !== "image/jpeg" && type !== "image/png")) return null;
    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_REMOTE_BYTES) return null;
    // read as a stream and give up as soon as the limit is crossed (a lying / missing Content-Length can not bypass it)
    const chunks: Uint8Array[] = [];
    let received = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_REMOTE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString("base64")}`;
  } catch {
    return null;
  }
}

/** 1200×630 social card: cropped photo, dark falloff, big uppercase headline. */
export async function renderOg({ photo, kicker, title, subtitle }: OgOptions) {
  const src = await loadPhoto(photo);

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#000" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- satori (ImageResponse) needs a plain <img>
          <img
            src={src}
            alt=""
            width={1200}
            height={1800}
            style={{ position: "absolute", top: -420, left: 0, width: 1200, height: 1800, objectFit: "cover" }}
          />
        ) : null}
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
