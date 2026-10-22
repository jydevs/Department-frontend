import "server-only";
import { API_TIMEOUT_MS, apiBase } from "@/lib/api/config";
import { visitorHeaders } from "@/lib/api/http";

/** Name of the API's refresh cookie. The BFF forwards it by hand: the browser never holds it. */
export const API_REFRESH_COOKIE = "dept_ct";

export interface UpstreamResult {
  status: number;
  /** parsed JSON body, or null (204 / not JSON) */
  body: unknown;
  /** value of the API's rotated refresh cookie, when the response set one */
  refreshCookie: string | null;
  /** the API cleared its refresh cookie */
  refreshCleared: boolean;
  retryAfter: number | null;
}

interface UpstreamOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  /** refresh token to present as the API's `dept_ct` cookie */
  refreshToken?: string;
  query?: Record<string, string | number | undefined>;
  /** request being served: gives the visitor IP / user agent to the API */
  req: Request;
}

/** Extracts the value of cookie `name` from the Set-Cookie headers of a response. */
function readSetCookie(res: Response, name: string): { value: string | null; cleared: boolean } {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const line of list) {
    const first = line.split(";")[0] ?? "";
    const idx = first.indexOf("=");
    if (idx < 0 || first.slice(0, idx).trim() !== name) continue;
    const raw = first.slice(idx + 1).trim();
    let value: string;
    try {
      value = decodeURIComponent(raw);
    } catch {
      continue;
    }
    return value ? { value, cleared: false } : { value: null, cleared: true };
  }
  return { value: null, cleared: false };
}

/**
 * Calls the customers API from the Next server. Never throws: a network failure or a timeout becomes status 0.
 * Tokens and passwords travel only in headers / the body and are never logged.
 */
export async function upstream(path: string, opts: UpstreamOptions): Promise<UpstreamResult> {
  const { method = "GET", body, accessToken, refreshToken, query, req } = opts;
  const url = new URL(`${apiBase()}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json", ...visitorHeaders(req) };
  const key = process.env.STOREFRONT_SERVER_KEY;
  if (key) headers["X-Storefront-Key"] = key;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (refreshToken) headers.Cookie = `${API_REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`;
  const ua = req.headers.get("user-agent");
  if (ua) headers["User-Agent"] = ua.slice(0, 255);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(API_TIMEOUT_MS * 2),
    });
  } catch {
    return { status: 0, body: null, refreshCookie: null, refreshCleared: false, retryAfter: null };
  }

  let parsed: unknown = null;
  if (res.status !== 204) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  }
  const cookie = readSetCookie(res, API_REFRESH_COOKIE);
  const retry = Number(res.headers.get("retry-after"));
  return {
    status: res.status,
    body: parsed,
    refreshCookie: cookie.value,
    refreshCleared: cookie.cleared,
    retryAfter: Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : null,
  };
}
