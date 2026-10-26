/**
 * Site-wide constants for metadata / SEO.
 *
 * NEXT_PUBLIC_SITE_URL    canonical origin (no trailing slash). Defaults to localhost.
 * NEXT_PUBLIC_INDEXABLE   "true" lets search engines index the site. Off by default:
 *                         this is a replica, it must not compete with the real store.
 */
import { requireProductionUrl } from "@/lib/api/config";

export const SITE_NAME = "Daregular Dept.";
export const SITE_TAGLINE = "Uniforms for the unnoticed.";
export const SITE_DESCRIPTION =
  "Uniforms for the unnoticed. Rags to Riches — Extended Version: ropa que no diseña ropa, sino mensajes.";

const validUrl = (v: string | undefined): string | undefined => {
  try {
    return v && /^https?:$/.test(new URL(v).protocol) ? v : undefined;
  } catch {
    return undefined;
  }
};

/** Origen canónico validado: en producción debe ser https real (si no, el build/arranque falla con un mensaje claro); en QA, localhost si falta o es basura (así `new URL(SITE_URL)` nunca falla). */
export const SITE_URL = (
  validUrl(requireProductionUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) ?? "http://localhost:3000"
).replace(/\/+$/, "");
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
