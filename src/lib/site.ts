/**
 * Site-wide constants that come from the ENVIRONMENT (everything editorial — name, tagline, SEO texts,
 * colours — comes from the CMS: settings/site; see lib/api/content.ts).
 *
 * NEXT_PUBLIC_SITE_URL    canonical origin (no trailing slash). Defaults to localhost.
 * NEXT_PUBLIC_INDEXABLE   "true" lets search engines index the site. Off by default:
 *                         it must not compete with the real store until it goes live.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
