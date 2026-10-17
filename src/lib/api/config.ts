/**
 * API location helpers.
 *
 * Server side (data fetching, route handlers):
 *   API_URL              origin of the backend, e.g. https://api.example.com (preferred)
 *   NEXT_PUBLIC_API_URL  fallback; also what the BROWSER uses for the contact / newsletter forms
 *
 * Both accept the origin with or without a trailing "/api/v1" or "/": the storefront always appends
 * "/api/v1" itself.
 */

const DEFAULT_ORIGIN = "http://localhost:4000";

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  if (!/^https?:\/\//.test(trimmed)) return null;
  return trimmed;
}

/** Origin of the backend, for server code (never ends with a slash nor with /api/v1). */
export function apiOrigin(): string {
  return normalizeOrigin(process.env.API_URL) ?? normalizeOrigin(process.env.NEXT_PUBLIC_API_URL) ?? DEFAULT_ORIGIN;
}

/** Origin of the backend, for browser code (only NEXT_PUBLIC_* is available there). */
export function publicApiOrigin(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_API_URL) ?? DEFAULT_ORIGIN;
}

/** `${origin}/api/v1` for server code. */
export function apiBase(): string {
  return `${apiOrigin()}/api/v1`;
}

/** `${origin}/api/v1` for browser code. */
export function publicApiBase(): string {
  return `${publicApiOrigin()}/api/v1`;
}

/** Request timeout for every server-side API call. */
export const API_TIMEOUT_MS = 5000;

/** Seconds a cached API response may be reused before Next revalidates it (tags revalidate it sooner). */
export const API_REVALIDATE_SECONDS = 60;
