import type { NextConfig } from "next";

/**
 * Security headers applied to every route. No CSP yet: next/font, next/og and the
 * inline keyframe <style> tags would need a nonce strategy first.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * Hosts next/image may optimise: ONLY the PUBLIC origin that serves the uploaded files (`/media/**`).
 * NEXT_PUBLIC_MEDIA_URL wins over NEXT_PUBLIC_API_URL; the internal API_URL is never used here.
 */
function mediaOrigin(): URL | null {
  const raw = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw.trim().replace(/\/+$/, "").replace(/\/api\/v1$/, ""));
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const media = mediaOrigin();
const isLocalHost = media !== null && ["localhost", "127.0.0.1", "[::1]"].includes(media.hostname);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // files keep stable names, so don't cache optimised variants for too long
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: media
      ? [
          {
            protocol: media.protocol === "http:" ? "http" : "https",
            hostname: media.hostname,
            ...(media.port ? { port: media.port } : null),
            pathname: "/media/**",
          },
        ]
      : [],
    // the optimiser refuses loopback addresses; only a local development API needs the exception
    ...(isLocalHost && process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : null),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
