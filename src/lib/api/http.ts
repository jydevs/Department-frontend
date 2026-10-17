import { cookies, draftMode } from "next/headers";
import { API_REVALIDATE_SECONDS, API_TIMEOUT_MS, apiBase } from "./config";
import type { ApiErrorBody } from "./types";

/** Name of the session cookie that holds the CMS preview token while Draft Mode is on. */
export const PREVIEW_COOKIE = "dept_preview";

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

/**
 * GET of a CMS content document. In Draft Mode the draft is requested with the visitor's preview
 * token and never cached; a token is valid for ONE document only, so a 401 for any other document
 * silently falls back to its published version.
 */
export async function contentGet<T>(path: string, tags: string[]): Promise<T | null> {
  const token = await getPreviewToken();
  if (token) {
    try {
      return await apiGet<T>(path, { noStore: true, query: { preview: token } });
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 401 && err.status !== 400)) throw err;
    }
  }
  return apiGet<T>(path, { tags });
}
