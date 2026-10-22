/**
 * Site-wide constants that come from the ENVIRONMENT (everything editorial — name, tagline, SEO texts,
 * colours — comes from the CMS: settings/site; see lib/api/content.ts).
 *
 * NEXT_PUBLIC_SITE_URL    canonical origin (no trailing slash). Required in production; defaults to localhost in dev.
 * NEXT_PUBLIC_INDEXABLE   "true" lets search engines index the site. Off by default:
 *                         it must not compete with the real store until it goes live.
 */
function defaultSiteUrl(): string {
  // a production build/server must never fall back to localhost (canonical URLs, sitemap and e-mail links would break)
  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta NEXT_PUBLIC_SITE_URL: el build/arranque de producción exige el origen canónico del sitio (p. ej. https://daregular.com).");
  }
  return "http://localhost:3000";
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl()).replace(/\/$/, "");
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
