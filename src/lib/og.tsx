import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

interface OgOptions {
  /** `/images/x.jpg` (public/), an https URL, or the API's own media URL; missing / unreadable → plain black card */
  photo?: string | null;
  kicker?: string;
  title: string;
  subtitle?: string;
}

const MAX_REMOTE_BYTES = 6 * 1024 * 1024;

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
    const res = await fetch(photo, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || (type !== "image/jpeg" && type !== "image/png")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_REMOTE_BYTES) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
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
