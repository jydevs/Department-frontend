import { publicApiOrigin, publicMediaOrigin } from "./config";

/** Media origins whose absolute URLs are trusted (any scheme: local development serves http). */
export function trustedMediaOrigins(): string[] {
  return [...new Set([publicMediaOrigin(), publicApiOrigin()])];
}

/** True for an absolute URL served by one of the trusted media origins. */
export function isTrustedMediaUrl(url: string): boolean {
  return trustedMediaOrigins().some((origin) => url.startsWith(`${origin}/`));
}

/**
 * Normalises an image URL coming from the API / CMS:
 *  - `https://…`  → as is (the host must be allowed in next.config `images.remotePatterns`, which only lists the API's)
 *  - `/images/…`  → served from this app's public/ folder
 *  - `/media/…`   → uploaded file served by the API, so it gets the PUBLIC media origin (never the internal API_URL)
 * Anything else (javascript:, data:, protocol-relative…) is rejected (returns null).
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const value = url.trim();
  if (value.startsWith("//") || value.includes("\\")) return null;
  if (value.startsWith("/media/")) return `${publicMediaOrigin()}${value}`;
  if (value.startsWith("/")) return value;
  if (value.startsWith("https://")) return value;
  // the API's own public origin is trusted whatever its scheme (self-hosted deployments, local development)
  if (isTrustedMediaUrl(value)) return value;
  return null;
}

/**
 * Whether next/image may optimise this src: local files and the trusted media origin (the only remote host in
 * `images.remotePatterns`). Any other https image coming from the CMS is served as is (`unoptimized`) instead of
 * crashing the render with "hostname not configured".
 */
export function canOptimize(src: string): boolean {
  return src.startsWith("/") || isTrustedMediaUrl(src);
}
