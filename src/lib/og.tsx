import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

interface OgOptions {
  /** file inside public/images, e.g. "home-hero.jpg" */
  photo: string;
  kicker?: string;
  title: string;
  subtitle?: string;
}

/** 1200×630 social card: cropped photo, dark falloff, big uppercase headline. */
export async function renderOg({ photo, kicker, title, subtitle }: OgOptions) {
  const file = await readFile(path.join(process.cwd(), "public", "images", photo));
  const src = `data:image/jpeg;base64,${file.toString("base64")}`;

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
