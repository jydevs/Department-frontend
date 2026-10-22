import "server-only";
import { cookies, draftMode } from "next/headers";
import { decodePreviewTarget, PREVIEW_COOKIE, type PreviewTarget } from "@/lib/preview";
import { API_REVALIDATE_SECONDS, API_TIMEOUT_MS, apiBase } from "./config";
import type { ApiErrorBody } from "./types";

/** Anything other than a 2xx / 404 answer, a timeout or a network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export interface ApiGetOptions {
  /** Next.js cache tags for this response */
  tags?: string[];
  /** seconds; defaults to API_REVALIDATE_SECONDS */
  revalidate?: number;
  query?: Record<string, QueryValue>;
  /** extra headers (e.g. X-Visitor-Ip from the search proxy) */
  headers?: Record<string, string>;
  /** skip the Next data cache */
  noStore?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${apiBase()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function serverHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  const key = process.env.STOREFRONT_SERVER_KEY;
  if (key) headers["X-Storefront-Key"] = key;
  return headers;
}

/**
 * GET against the storefront API from the server.
 * - 2xx  → parsed JSON
 * - 404  → null (the caller decides between notFound() and a fallback)
 * - else → throws ApiError (timeouts and network failures included, status 0)
 */
export async function apiGet<T>(path: string, options: ApiGetOptions = {}): Promise<T | null> {
  const { tags, revalidate = API_REVALIDATE_SECONDS, query, headers, noStore } = options;
  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method: "GET",
    headers: serverHeaders(headers),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  };
  if (noStore) init.cache = "no-store";
  else init.next = { revalidate, tags };

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), init);
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : "API request failed", 0, "NETWORK");
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    let code: string | null = null;
    let message = `API ${res.status}`;
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>;
      code = body.code ?? null;
      if (body.message) message = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status, code);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("API returned invalid JSON", res.status, "BAD_JSON");
  }
}

/** The preview token of this request, only while Draft Mode is on. Never throws. */
export async function getPreviewToken(): Promise<string | null> {
  try {
    const draft = await draftMode();
    if (!draft.isEnabled) return null;
    const jar = await cookies();
    return jar.get(PREVIEW_COOKIE)?.value ?? null;
  } catch {
    // outside a request scope (build-time helpers): behave as a normal visitor
    return null;
  }
}

/** Content document a `/storefront/content/…` path reads, in the vocabulary of the preview tokens. */
function documentOfPath(path: string): PreviewTarget | null {
  const m = /^\/storefront\/content\/(settings|menus|templates|pages)(?:\/([^/?]+))?$/.exec(path);
  if (!m) return null;
  try {
    switch (m[1]) {
      case "settings":
        return { kind: "settings", key: "site" };
      case "menus":
        return m[2] ? { kind: "menu", key: decodeURIComponent(m[2]) } : null;
      case "templates":
        return m[2] ? { kind: "template", key: decodeURIComponent(m[2]) } : null;
      default:
        return m[2] ? { kind: "page", key: decodeURIComponent(m[2]) } : null;
    }
  } catch {
    return null;
  }
}

/**
 * GET of a CMS content document. In Draft Mode the draft is requested with the visitor's preview token and is NEVER
 * cached (no-store: neither the data cache nor another visitor can ever see it). A token is valid for ONE document, so
 * it is only sent for that document; every other document (and an expired / rejected token: 400 / 401) is served from
 * its published version through the normal cache.
 */
export async function contentGet<T>(path: string, tags: string[]): Promise<T | null> {
  const token = await getPreviewToken();
  if (token) {
    const target = decodePreviewTarget(token);
    const wanted = documentOfPath(path);
    if (target && wanted && target.kind === wanted.kind && target.key === wanted.key) {
      try {
        return await apiGet<T>(path, { noStore: true, query: { preview: token } });
      } catch (err) {
        if (!(err instanceof ApiError) || (err.status !== 401 && err.status !== 400)) throw err;
      }
    }
  }
  return apiGet<T>(path, { tags });
}

/**
 * Headers that let the backend rate-limit per VISITOR instead of per Next host: `X-Visitor-Ip` is only honoured by the
 * API together with the server key (`X-Storefront-Key`, added by every call), so nothing is forwarded without it.
 */
export function visitorHeaders(req: Request): Record<string, string> {
  if (!process.env.STOREFRONT_SERVER_KEY) return {};
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim() || "";
  // an IPv4 / IPv6 literal only: anything else (spoofed text) is dropped
  return ip.length > 0 && ip.length <= 45 && /^[0-9a-fA-F:.]+$/.test(ip) ? { "X-Visitor-Ip": ip } : {};
}
