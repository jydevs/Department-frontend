/**
 * Redirecciones del CMS (`GET /storefront/redirects`, administradas en /admin/redirects).
 * Se aplican antes de renderizar. La lista se guarda en memoria unos segundos para no consultar la API en cada petición;
 * si la API no responde se sigue sirviendo la tienda sin redirecciones.
 */
import { NextResponse, type NextRequest } from "next/server";
import { API_PREFIX, API_URL_SERVER, STOREFRONT_SERVER_KEY } from "@/lib/api/config";

interface Rule { from: string; to: string; status: number }

const TTL_MS = 60_000;
let cache: { at: number; map: Map<string, Rule> } | null = null;
let inflight: Promise<Map<string, Rule>> | null = null;

const norm = (p: string): string => {
  const x = p.length > 1 ? p.replace(/\/+$/, "") : p;
  return x.toLowerCase();
};

async function load(): Promise<Map<string, Rule>> {
  try {
    const res = await fetch(`${API_URL_SERVER}${API_PREFIX}/storefront/redirects`, {
      headers: { Accept: "application/json", ...(STOREFRONT_SERVER_KEY ? { "X-Storefront-Key": STOREFRONT_SERVER_KEY } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rules = (await res.json()) as Rule[];
    return new Map(rules.map((r) => [norm(r.from), r]));
  } catch {
    return cache?.map ?? new Map();
  }
}

async function rules(): Promise<Map<string, Rule>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  inflight ??= load().then((map) => {
    cache = { at: Date.now(), map };
    return map;
  }).finally(() => { inflight = null; });
  return inflight;
}

export async function proxy(req: NextRequest) {
  const rule = (await rules()).get(norm(req.nextUrl.pathname));
  if (!rule) return NextResponse.next();
  const target = /^https?:\/\//i.test(rule.to)
    ? new URL(rule.to)
    : rule.to.startsWith("/") && !rule.to.startsWith("//")
      ? new URL(rule.to, req.url)
      : null;
  if (!target) return NextResponse.next();
  if (!target.search) target.search = req.nextUrl.search;
  return NextResponse.redirect(target, rule.status === 302 ? 302 : 301);
}

export const config = {
  // Solo páginas de la tienda: fuera API, panel, estáticos e imágenes.
  matcher: ["/((?!api|admin|_next|mock-checkout|.*\\..*).*)"],
};
