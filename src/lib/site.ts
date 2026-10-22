/**
 * Site-wide constants that come from the ENVIRONMENT (everything editorial — name, tagline, SEO texts,
 * colours — comes from the CMS: settings/site; see lib/api/content.ts).
 *
 * NEXT_PUBLIC_SITE_URL    canonical origin (no trailing slash). Required in production; defaults to localhost in dev.
 * STOREFRONT_SERVER_KEY   (server only) required in production, like NEXT_PUBLIC_SITE_URL: without it the API cannot tell
 *                         visitors apart and rate-limits the whole site as one client.
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

function requireServerKey(): void {
  if (process.env.NODE_ENV === "production" && !process.env.STOREFRONT_SERVER_KEY) {
    throw new Error("Falta STOREFRONT_SERVER_KEY: el build/arranque de producción exige la llave de servidor del storefront (la misma que STOREFRONT_SERVER_KEY del backend).");
  }
}
requireServerKey();

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl()).replace(/\/$/, "");
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
