/**
 * Site-wide constants for metadata / SEO.
 *
 * NEXT_PUBLIC_SITE_URL    canonical origin (no trailing slash). Defaults to localhost.
 * NEXT_PUBLIC_INDEXABLE   "true" lets search engines index the site. Off by default:
 *                         this is a replica, it must not compete with the real store.
 */
export const SITE_NAME = "Daregular Dept.";
export const SITE_TAGLINE = "Uniforms for the unnoticed.";
export const SITE_DESCRIPTION =
  "Uniforms for the unnoticed. Rags to Riches — Extended Version: ropa que no diseña ropa, sino mensajes.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
