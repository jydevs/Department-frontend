/**
 * Fetch de SERVIDOR (server components, route handlers, sitemap) contra `/api/v1/storefront/*`.
 * Usa la caché de datos de Next (`next.tags` / `next.revalidate`) para que la tienda sea rápida y
 * `POST /api/revalidate` (webhook del backend) pueda invalidar el contenido por etiquetas.
 */
import { API_PREFIX, API_URL_SERVER, STOREFRONT_SERVER_KEY } from "./config";
import { ApiError, type ApiErrorBody } from "./errors";

export interface SfOptions {
  tags?: string[];
  /** segundos (por defecto 60); `false` = sin caché */
  revalidate?: number | false;
  /** token de vista previa de contenido (modo borrador) */
  preview?: string;
  /** devuelve `null` en 404 en lugar de lanzar */
  allow404?: boolean;
  query?: Record<string, string | number | undefined>;
}

const RETRYABLE = new Set([429, 502, 503, 504]);
const RETRIES = 4;
const MAX_WAIT_MS = 20_000;

export async function sfGet<T>(path: string, opts: SfOptions = {}): Promise<T | null> {
  const url = new URL(`${API_URL_SERVER}${API_PREFIX}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  if (opts.preview) url.searchParams.set("preview", opts.preview);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (STOREFRONT_SERVER_KEY) headers["X-Storefront-Key"] = STOREFRONT_SERVER_KEY;
  const init: RequestInit & { next?: { revalidate: number; tags?: string[] } } = {
    headers,
    ...(opts.preview || opts.revalidate === false ? { cache: "no-store" as const } : { next: { revalidate: opts.revalidate ?? 60, tags: opts.tags } }),
  };
  // Durante `next build` se hacen muchas peticiones seguidas: si el limitador de la API responde 429
  // (o la API está arrancando: 502/503) se espera lo que indique `Retry-After` y se reintenta.
  let res = await fetch(url, init);
  for (let attempt = 1; attempt <= RETRIES && RETRYABLE.has(res.status); attempt++) {
    const wait = Math.min(Number(res.headers.get("retry-after")) * 1000 || 1000 * attempt, MAX_WAIT_MS);
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(url, init);
  }
  if (res.status === 404 && opts.allow404) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body ?? { statusCode: res.status, error: res.statusText, code: "UNKNOWN", message: `La API respondió ${res.status} en ${path}` });
  }
  return (await res.json()) as T;
}
