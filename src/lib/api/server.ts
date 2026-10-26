/**
 * Fetch de SERVIDOR (server components, route handlers, sitemap) contra `/api/v1/storefront/*`.
 * Usa la caché de datos de Next (`next.tags` / `next.revalidate`) para que la tienda sea rápida y
 * `POST /api/revalidate` (webhook del backend) pueda invalidar el contenido por etiquetas.
 *
 * Fallos de la API (red, tiempo de espera, 5xx):
 *  - en RUNTIME se lanza el error: en ISR Next conserva la última versión buena de la página y en una
 *    petición nueva se muestra `error.tsx` (nunca se cachea HTML degradado);
 *  - durante `next build` se llama a `connection()`: la página pasa a renderizarse bajo demanda en lugar
 *    de romper el build (con la API caída el build termina y las páginas se generan cuando vuelva).
 */
import { connection } from "next/server";
import { API_PREFIX, API_URL_SERVER, STOREFRONT_SERVER_KEY } from "./config";
import { ApiError, type ApiErrorBody } from "./errors";

export interface SfOptions {
  tags?: string[];
  /** segundos (por defecto 60); `false` = sin caché */
  revalidate?: number | false;
  /** token de vista previa de contenido (modo borrador) */
  preview?: string;
  /** devuelve `null` en 404 (y en 400 de validación, p. ej. un handle con formato inválido) en lugar de lanzar */
  allow404?: boolean;
  query?: Record<string, string | number | undefined>;
  /**
   * Con `false`, durante el build un fallo se lanza tal cual (para código que no es una página: `generateStaticParams`,
   * sitemap…). Por defecto `true`: la página pasa a dinámica.
   */
  bail?: boolean;
}

const RETRYABLE = new Set([429, 502, 503, 504]);
const RETRIES = 3;
const MAX_WAIT_MS = 10_000;
/** Tiempo máximo de CADA intento: una API colgada no debe bloquear el render ni el build. */
const TIMEOUT_MS = 8000;
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fail(error: unknown, bail: boolean): Promise<never> {
  if (IS_BUILD && bail) await connection(); // lanza la señal "render dinámico"; no vuelve
  throw error;
}

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
  const bail = opts.bail ?? true;
  const request = () => fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

  // Durante `next build` se hacen muchas peticiones seguidas: si el limitador de la API responde 429
  // (o la API está arrancando: 502/503) se espera lo que indique `Retry-After` y se reintenta.
  let res: Response;
  try {
    res = await request();
    for (let attempt = 1; attempt <= RETRIES && RETRYABLE.has(res.status); attempt++) {
      await sleep(Math.min(Number(res.headers.get("retry-after")) * 1000 || 1000 * attempt, MAX_WAIT_MS));
      res = await request();
    }
  } catch (e) {
    return fail(new ApiError({ statusCode: 0, error: "Network", code: "NETWORK_ERROR", message: `No se pudo conectar con la API (${path}): ${e instanceof Error ? e.message : String(e)}` }), bail);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    // 404 (o un handle con formato inválido → 400 VALIDATION_ERROR) = "no existe", no un fallo
    if (opts.allow404 && (res.status === 404 || (res.status === 400 && body?.code === "VALIDATION_ERROR"))) return null;
    const error = new ApiError(body ?? { statusCode: res.status, error: res.statusText, code: "UNKNOWN", message: `La API respondió ${res.status} en ${path}` });
    if (res.status >= 500 || res.status === 429) return fail(error, bail);
    throw error;
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    return fail(new ApiError({ statusCode: 502, error: "BadGateway", code: "BAD_RESPONSE", message: `Respuesta no válida de la API en ${path}: ${e instanceof Error ? e.message : String(e)}` }), bail);
  }
}
