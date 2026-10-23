import { publicApiOrigin } from "@/lib/api/config";
import { ApiError, type ApiErrorBody } from "@/lib/admin/errors";

export { ApiError } from "@/lib/admin/errors";

/** Mismo origen público de la API que usa la tienda en el navegador (NEXT_PUBLIC_API_URL, con o sin /api/v1). */
const ORIGIN = publicApiOrigin();
export const API_BASE = `${ORIGIN}/api/v1`;
export const API_ORIGIN = ORIGIN;

export type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/* ---------- token en memoria (nunca en localStorage ni cookies propias) ---------- */

let accessToken: string | null = null;
let expiresAt = 0;
/** Cuenta los tokens recibidos (propios o de otra pestaña): permite saber si alguien renovó mientras esperábamos. */
let tokenVersion = 0;
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let securityGateHandler: (() => void) | null = null;

const REFRESH_LOCK = "dept-admin-refresh";
const CHANNEL_NAME = "dept-admin-auth";
/** Un token al que le queda menos de esto se considera a punto de caducar. */
const FRESH_MARGIN_MS = 5_000;

interface TokenMessage {
  accessToken: string;
  expiresIn: number;
}

let channel: BroadcastChannel | null = null;

function authChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  // otra pestaña renovó la sesión: adoptamos su token (sin volver a presentar la cookie de refresco)
  channel.onmessage = (event: MessageEvent<TokenMessage>) => {
    const msg = event.data;
    if (msg && typeof msg.accessToken === "string" && typeof msg.expiresIn === "number") {
      setAccessToken(msg.accessToken, msg.expiresIn);
    }
  };
  return channel;
}

export function setAccessToken(token: string | null, expiresInSeconds?: number): void {
  accessToken = token;
  expiresAt = token && expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : 0;
  if (token) tokenVersion++;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Milisegundos hasta que caduca el token actual (0 si desconocido). */
export function accessTokenTtlMs(): number {
  return expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
}

/** El AuthProvider registra aquí qué hacer cuando la sesión ya no se puede renovar. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

/**
 * El AuthProvider registra aquí qué hacer cuando la API responde 403 PASSWORD_CHANGE_REQUIRED o
 * TWO_FACTOR_SETUP_REQUIRED: volver a leer /auth/me para que el panel muestre la pantalla correspondiente.
 */
export function setSecurityGateHandler(fn: (() => void) | null): void {
  securityGateHandler = fn;
}

const SECURITY_GATE_CODES = ["PASSWORD_CHANGE_REQUIRED", "TWO_FACTOR_SETUP_REQUIRED"];

async function isSecurityGateError(res: Response): Promise<boolean> {
  try {
    const body = (await res.clone().json()) as Partial<ApiErrorBody>;
    return typeof body.code === "string" && SECURITY_GATE_CODES.includes(body.code);
  } catch {
    return false;
  }
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

async function presentRefreshCookie(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      setAccessToken(null);
      return null;
    }
    // 200 o 201: dentro de los 20 s de gracia la API devuelve solo el accessToken, sin Set-Cookie (la petición que
    // ganó ya dejó la cookie nueva). Es un éxito, no se toca la sesión.
    const data = (await res.json()) as RefreshResult;
    if (typeof data.accessToken !== "string") {
      setAccessToken(null);
      return null;
    }
    setAccessToken(data.accessToken, data.expiresIn);
    try {
      authChannel()?.postMessage({ accessToken: data.accessToken, expiresIn: data.expiresIn } satisfies TokenMessage);
    } catch {
      /* canal cerrado */
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

/**
 * POST /auth/refresh con la cookie httpOnly. Las llamadas concurrentes de una pestaña comparten la misma promesa y
 * las de varias pestañas se serializan con un lock del navegador: la cookie rota en cada uso y presentarla dos veces
 * revocaría la sesión. Quien obtiene el lock tras otra pestaña que ya renovó usa el token que esta difundió por
 * BroadcastChannel en lugar de volver a presentar la cookie. Sin Web Locks se renueva sin coordinar. Devuelve el
 * token nuevo o null si no hay sesión.
 */
export function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  authChannel();
  const versionBefore = tokenVersion;
  const run = async (): Promise<string | null> => {
    if (tokenVersion !== versionBefore && accessToken && expiresAt - Date.now() > FRESH_MARGIN_MS) return accessToken;
    return presentRefreshCookie();
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const pending: Promise<string | null> = (async () => (locks ? await locks.request(REFRESH_LOCK, run) : await run()))();
  refreshInFlight = pending.finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/* ---------- núcleo ---------- */

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await res.json()) as Partial<ApiErrorBody>;
  } catch {
    /* cuerpo no JSON */
  }
  const retry = Number(res.headers.get("Retry-After"));
  return new ApiError({
    status: res.status,
    code: body.code ?? (res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : "ERROR"),
    message: body.message ?? res.statusText ?? "Error",
    details: body.details,
    requestId: body.requestId ?? res.headers.get("X-Request-Id") ?? undefined,
    retryAfter: Number.isFinite(retry) && retry > 0 ? retry : undefined,
  });
}

/** 401 por contraseña/código incorrectos: es un error del formulario, no una sesión caducada. */
async function isCredentialsError(res: Response): Promise<boolean> {
  try {
    const body = (await res.clone().json()) as Partial<ApiErrorBody>;
    return body.code === "INVALID_CREDENTIALS";
  } catch {
    return false;
  }
}

const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh"];

async function send(method: string, path: string, init: { body?: BodyInit; json?: unknown; opts?: RequestOptions }): Promise<Response> {
  const { opts } = init;
  const attempt = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json", ...(opts?.headers ?? {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    let body: BodyInit | undefined = init.body;
    if (init.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(init.json);
    }
    try {
      return await fetch(buildUrl(path, opts?.query), { method, headers, body, credentials: "include", signal: opts?.signal });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor" });
    }
  };

  // Renueva de forma preventiva si el token está a punto de caducar.
  if (accessToken && expiresAt && expiresAt - Date.now() < 5_000 && !NO_REFRESH_PATHS.includes(path)) {
    await refreshSession();
  }

  let res = await attempt(accessToken);
  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path) && !(await isCredentialsError(res))) {
    const fresh = await refreshSession();
    if (fresh) {
      // un FormData ya consumido no se puede reenviar: los reintentos solo aplican a JSON/GET
      res = await attempt(fresh);
    }
    if (res.status === 401) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }
  }
  if (res.status === 403 && (await isSecurityGateError(res))) securityGateHandler?.();
  return res;
}

async function request<T>(method: string, path: string, init: { body?: BodyInit; json?: unknown; opts?: RequestOptions }): Promise<T> {
  const res = await send(method, path, init);
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>("GET", path, { opts });
  },
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { json: body, opts });
  },
  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, { json: body, opts });
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, { json: body, opts });
  },
  delete<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, { json: body, opts });
  },
  /** multipart/form-data (el navegador fija el boundary). */
  upload<T>(path: string, form: FormData, opts?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { body: form, opts });
  },
  /** Descarga binaria (p. ej. CSV). */
  async download(path: string, opts?: RequestOptions): Promise<Blob> {
    const res = await send("GET", path, { opts });
    if (!res.ok) throw await toApiError(res);
    return res.blob();
  },
};

/** Descarga un Blob como archivo desde el navegador. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
