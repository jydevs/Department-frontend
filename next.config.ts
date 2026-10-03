import type { NextConfig } from "next";
import { API_URL_PUBLIC, APP_ENV } from "./src/lib/api/config";

const isDev = process.env.NODE_ENV !== "production";
const WOMPI = ["https://production.wompi.co", "https://sandbox.wompi.co", "https://checkout.wompi.co"];
const apiOrigin = new URL(API_URL_PUBLIC).origin;

/**
 * Content-Security-Policy. Next inyecta scripts inline (hidratación) y la tienda usa <style> inline, por eso
 * 'unsafe-inline' (una política con nonce obligaría a renderizar todo dinámicamente). Lo que SÍ se restringe:
 * orígenes de red, objetos, <base>, formularios y quién puede enmarcar la tienda. next/font es self-hosted.
 * En desarrollo hace falta 'unsafe-eval' (React Refresh) y el websocket del HMR.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // la API sirve los medios subidos (puede ser http://localhost en QA)
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  `media-src 'self' blob: https: ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${WOMPI.join(" ")}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  `frame-src 'self' ${WOMPI.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${WOMPI.join(" ")}`,
  "frame-ancestors 'self'",
  ...(APP_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** Security headers applied to every route. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Imagen Docker mínima (.next/standalone + server.js), ver Dockerfile
  output: "standalone",
  // raíz explícita: evita que un lockfile ajeno en un directorio superior desplace .next/standalone/server.js
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // files keep stable names, so don't cache optimised variants for too long
    minimumCacheTTL: 60 * 60 * 24 * 7,
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
