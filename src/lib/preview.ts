/**
 * Helpers of the CMS preview flow (admin → `/api/preview?token=…` → Draft Mode).
 *
 * The preview token is a JWT signed by the backend. The storefront NEVER trusts it: it is forwarded as
 * `?preview=<token>` and the API verifies it. Here it is only decoded (without verifying) to decide which page to
 * open and which content document the token belongs to.
 */

/** Session cookie that holds the preview token while Draft Mode is on. */
export const PREVIEW_COOKIE = "dept_preview";

/** Lifetime of the cookie (the backend's tokens live one hour). */
export const PREVIEW_COOKIE_MAX_AGE = 3600;

const JWT_FORMAT = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const MAX_TOKEN_LENGTH = 4000;
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_PATH = /^\/(?!\/)[^\s\\\u0000-\u001f\u007f]*$/;

export function isPreviewToken(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_TOKEN_LENGTH && JWT_FORMAT.test(value);
}

/** The document a preview token was issued for. */
export interface PreviewTarget {
  kind: string;
  key: string;
}

/** Reads `{ kind, key }` from the payload of the token WITHOUT verifying its signature. Null when malformed. */
export function decodePreviewTarget(token: string): PreviewTarget | null {
  if (!isPreviewToken(token)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null) return null;
    const { kind, key } = payload as { kind?: unknown; key?: unknown };
    return typeof kind === "string" && typeof key === "string" ? { kind, key } : null;
  } catch {
    return null;
  }
}

/** A same-site path (`/…`, never `//host`, backslashes, whitespace or a scheme), or null. */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  if (!INTERNAL_PATH.test(value) || value.includes("://")) return null;
  // also the DECODED form: an encoded tab or backslash must not become a protocol-relative URL for a lenient client
  try {
    if (!INTERNAL_PATH.test(decodeURIComponent(value))) return null;
  } catch {
    return null;
  }
  return value;
}

/**
 * Internal route that shows the document of a token. `firstProductPath` (resolved by the caller) is used for the
 * product template; everything else is a fixed route: a token can never choose a free-form destination.
 */
export function routeForPreview(target: PreviewTarget | null, firstProductPath?: string | null): string {
  if (!target) return "/";
  const { kind, key } = target;
  if (kind === "page") return HANDLE.test(key) ? `/pages/${key}` : "/";
  if (kind === "template") {
    switch (key) {
      case "collection":
        return "/collections/all";
      case "product":
        return firstProductPath ?? "/collections/all";
      case "404":
        return "/no-existe-preview";
      default:
        return "/"; // home, layout, search, cart…
    }
  }
  return "/"; // settings/site, menus
}
