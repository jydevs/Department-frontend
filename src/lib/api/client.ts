"use client";
/**
 * Fetch del NAVEGADOR contra `/api/v1/*` (CORS con `credentials` para las cookies de cliente `dept_ct`).
 * Los tokens de acceso de cliente viven solo en memoria (ver `lib/account/index.ts`).
 */
import { API_PREFIX, API_URL_PUBLIC } from "./config";
import { ApiError, isAbortError, type ApiErrorBody } from "./errors";

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
  } catch (e) {
    // una petición cancelada a propósito (AbortController) no es un fallo de red: quien llama decide qué hacer
    if (isAbortError(e) || opts.signal?.aborted) throw e;
    throw new ApiError({ statusCode: 0, error: "Network", code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor. Revisa tu conexión." });
  }
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const body = parsed && typeof parsed === "object" && typeof parsed.code === "string" ? parsed : null;
    throw new ApiError({
      statusCode: typeof body?.statusCode === "number" ? body.statusCode : res.status,
      error: body?.error ?? res.statusText,
      code: body?.code ?? (res.status >= 500 ? "SERVICE_ERROR" : "UNKNOWN"),
      message: body?.message ?? "Error del servidor",
      details: body?.details,
      requestId: body?.requestId,
    });
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError({ statusCode: res.status, error: "BadResponse", code: "SERVICE_ERROR", message: "Respuesta no válida del servidor" });
  }
}
