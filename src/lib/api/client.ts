"use client";
/**
 * Fetch del NAVEGADOR contra `/api/v1/*` (CORS con `credentials` para las cookies de cliente `dept_ct`).
 * Los tokens de acceso viven solo en memoria (ver `lib/account.tsx`).
 */
import { API_PREFIX, API_URL_PUBLIC } from "./config";
import { ApiError, type ApiErrorBody } from "./errors";

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  token?: string | null;
  /** envía/recibe cookies (login/refresh de cliente) */
  credentials?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const url = new URL(`${API_URL_PUBLIC}${API_PREFIX}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      credentials: opts.credentials ? "include" : "omit",
      signal: opts.signal,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...opts.headers,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError({ statusCode: 0, error: "Network", code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor. Revisa tu conexión." });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body ?? { statusCode: res.status, error: res.statusText, code: "UNKNOWN", message: "Error del servidor" });
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
