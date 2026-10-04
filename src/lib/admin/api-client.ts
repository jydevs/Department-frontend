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
export const restoreSession = async (): Promise<boolean> => (await refresh()) === "ok";

type Query = Record<string, string | number | boolean | undefined | null>;
interface Opts {
  query?: Query;
  headers?: Record<string, string>;
}
/** `ok`: token renovado; `denied`: la API rechazó la cookie (401/403, sesión perdida); `network`: no se pudo llegar a la API. */
type RefreshResult = "ok" | "denied" | "network";
let refreshing: Promise<RefreshResult> | null = null;

const networkError = (): ApiError =>
  new ApiError({ statusCode: 0, error: "Network Error", code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor" });

function refresh(): Promise<RefreshResult> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r): Promise<RefreshResult> => {
      if (r.ok) {
        accessToken = ((await r.json()) as { accessToken: string }).accessToken;
        return "ok";
      }
      // solo 401/403 significan "sesión perdida"; un 5xx/429 es un fallo transitorio del servidor
      return r.status === 401 || r.status === 403 ? "denied" : "network";
    })
    .catch((): RefreshResult => "network")
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Solo el inicio de sesión y la renovación no se reintentan tras un 401 (el resto, incluido /auth/logout, sí). */
const noRetry = (path: string) => path === "/auth/login" || path === "/auth/refresh";

async function raw(method: string, path: string, body: unknown, opts: Opts = {}, retry = true): Promise<Response> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...opts.headers,
      },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw networkError();
  }
  if (res.status === 401 && retry && !noRetry(path)) {
    const r = await refresh();
    if (r === "ok") return raw(method, path, body, opts, false);
    if (r === "network") throw networkError();
    accessToken = null;
    sessionLost?.();
  }
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(b ?? { statusCode: res.status, error: res.statusText, code: "UNKNOWN", message: "Error del servidor" });
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
