/**
 * Cliente HTTP del panel contra `/api/v1/admin/*` y `/api/v1/auth/*`.
 * El access token vive SOLO en memoria; la sesión se renueva con la cookie httpOnly `dept_rt`
 * (`POST /auth/refresh`). Si la renovación falla se avisa con `onSessionLost` (el panel vuelve al login).
 */
import { API_PREFIX, API_URL_PUBLIC } from "@/lib/api/config";
import { ApiError, type ApiErrorBody } from "./errors";

const BASE = `${API_URL_PUBLIC}${API_PREFIX}`;
let accessToken: string | null = null; // solo en memoria
let sessionLost: (() => void) | null = null;
export const setAccessToken = (t: string | null): void => {
  accessToken = t;
};
export const getAccessToken = (): string | null => accessToken;
export const onSessionLost = (fn: (() => void) | null): void => {
  sessionLost = fn;
};
/** Intenta restaurar la sesión con la cookie de refresco (arranque del panel). */
export const restoreSession = (): Promise<boolean> => refresh();

type Query = Record<string, string | number | boolean | undefined | null>;
interface Opts {
  query?: Query;
  headers?: Record<string, string>;
}
let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r) => {
      if (!r.ok) return false;
      accessToken = ((await r.json()) as { accessToken: string }).accessToken;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function raw(method: string, path: string, body: unknown, opts: Opts = {}, retry = true): Promise<Response> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...opts.headers,
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return raw(method, path, body, opts, false);
    accessToken = null;
    sessionLost?.();
  }
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(b ?? { statusCode: res.status, error: res.statusText, code: "UNKNOWN", message: "Error de red o servidor" });
  }
  return res;
}
const json = async <T>(r: Response): Promise<T> => {
  if (r.status === 204) return undefined as T;
  const text = await r.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

export const api = {
  get: async <T>(p: string, o?: Opts) => json<T>(await raw("GET", p, undefined, o)),
  post: async <T>(p: string, b?: unknown, o?: Opts) => json<T>(await raw("POST", p, b, o)),
  put: async <T>(p: string, b?: unknown, o?: Opts) => json<T>(await raw("PUT", p, b, o)),
  patch: async <T>(p: string, b?: unknown, o?: Opts) => json<T>(await raw("PATCH", p, b, o)),
  delete: async <T>(p: string, b?: unknown, o?: Opts) => json<T>(await raw("DELETE", p, b, o)),
  upload: async <T>(p: string, f: FormData) => json<T>(await raw("POST", p, f)),
  download: async (p: string, o?: Opts): Promise<Blob> => (await raw("GET", p, undefined, o)).blob(),
};
