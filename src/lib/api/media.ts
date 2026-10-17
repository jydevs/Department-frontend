import { apiOrigin } from "./config";

/**
 * Normalises an image URL coming from the API / CMS:
 *  - `https://…`  → as is (hosts must be allowed in next.config `images.remotePatterns`)
 *  - `/images/…`  → served from this app's public/ folder
 *  - `/media/…`   → uploaded file served by the API, so it gets the API origin
 * Anything else (javascript:, data:, protocol-relative…) is rejected (returns null).
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const value = url.trim();
  if (value.startsWith("//") || value.includes("\\")) return null;
  if (value.startsWith("/media/")) return `${apiOrigin()}${value}`;
  if (value.startsWith("/")) return value;
  if (value.startsWith("https://")) return value;
  // the API's own origin is trusted whatever its scheme (self-hosted deployments, local development)
  if (value.startsWith(`${apiOrigin()}/`)) return value;
  return null;
}
