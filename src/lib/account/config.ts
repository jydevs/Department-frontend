/**
 * Constants shared by the account BFF (route handlers under /api/account) and the browser code.
 * No secret and nothing server-only lives here.
 */

/** httpOnly cookie with the short-lived access token (JWT of the customer). Never readable from JavaScript. */
export const ACCESS_COOKIE = "dept_at";
/** httpOnly cookie with the rotating refresh token. Never readable from JavaScript. */
export const REFRESH_COOKIE = "dept_rt_c";

/** The access token cookie lives as long as the token, minus a margin so it never reaches the API already expired. */
export const ACCESS_COOKIE_MARGIN_SECONDS = 30;
/** Same lifetime the API gives its refresh cookie (30 days). */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Prefix of every BFF route the browser calls. */
export const BFF_BASE = "/api/account";

/** Pages of the account area that need a session. */
export const PROTECTED_PATHS = ["/account", "/account/addresses", "/account/orders", "/account/privacy"] as const;

export const MAX_ADDRESSES = 10;

/** Password rule of the API (`passwordSchema`): 12..256 characters. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

/** CMS pages the legal checkboxes link to. */
export const TERMS_HREF = "/pages/terminos-y-condiciones";
export const PRIVACY_HREF = "/pages/politica-de-privacidad";

/** Whether `pathname` is (or lives under) a page that needs a session. */
export function isProtectedPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return clean === "/account" || clean === "/account/addresses" || clean === "/account/privacy" || clean === "/account/orders" || clean.startsWith("/account/orders/");
}

/**
 * Validates the `next` parameter of the login page: only internal paths ("/x", never "//x" nor "/\x", no control
 * characters, no scheme). Anything else falls back to `fallback`. Prevents open redirects.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    // never bounce back into the auth screens
    if (/^\/account\/(login|register|forgot-password|reset-password|verify-email)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
