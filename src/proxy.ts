/**
 * Redirecciones del CMS (`GET /storefront/redirects`, administradas en /admin/redirects).
 * Se aplican antes de renderizar. La lista se guarda en memoria con stale-while-revalidate: con caché (aunque vieja)
 * se responde al instante y se refresca en segundo plano; solo la PRIMERA carga espera (máx. 800 ms). Si la API no
 * responde se sigue sirviendo la tienda sin redirecciones.
 *
 * Coincidencia de rutas: el backend guarda `fromPath` normalizado (`normalizePath`: minúsculas, sin barra final, `//`→`/`,
 * solo se decodifican los escapes no reservados). Aquí se aplica la MISMA normalización al pedido para que `/About/`
 * coincida con la regla `/about`; la coincidencia sin distinguir mayúsculas es, por tanto, intencional y consistente con la API.
 *
 * Destinos: ruta interna, o URL http(s) cuyo host sea el propio sitio o esté en `REDIRECT_ALLOWED_HOSTS`
 * (lista separada por comas, p. ej. `shop.example.com,partner.example.org`); los externos deben ser https.
 */
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { API_PREFIX, API_URL_SERVER, STOREFRONT_SERVER_KEY } from "@/lib/api/config";
import { SITE_URL } from "@/lib/site";
import { isSafePath } from "@/lib/url";

interface Rule { from: string; to: string; status: number }
type RuleMap = Map<string, Rule>;

const TTL_MS = 60_000;
const FAILED_TTL_MS = 10_000;
const FIRST_LOAD_WAIT_MS = 800;

let cache: { at: number; ttl: number; map: RuleMap } | null = null;
let inflight: Promise<void> | null = null;

/** Misma normalización que `normalizePath` del backend (ver cabecera). */
const norm = (input: string): string => {
  let p = input;
  try {
    p = p.replace(/%([0-9a-fA-F]{2})/g, (m, hex: string) => {
      const ch = String.fromCharCode(parseInt(hex, 16));
      return /[A-Za-z0-9\-._~]/.test(ch) ? ch : `%${hex.toLowerCase()}`;
    });
  } catch {
    /* tal cual */
  }
  p = p.toLowerCase().replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.length === 0 ? "/" : p;
};

const ownHost = new URL(SITE_URL).host.toLowerCase();
const allowedHosts = new Set([ownHost, ...(process.env.REDIRECT_ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)]);

/** Destino absoluto permitido: host del propio sitio/allowlist; los externos solo por https. */
function externalTarget(to: string): URL | null {
  let u: URL;
  try {
    u = new URL(to);
  } catch {
    return null;
  }
  if (u.username || u.password) return null;
  const host = u.host.toLowerCase();
  if (!allowedHosts.has(host)) return null;
  if (u.protocol !== "https:" && !(u.protocol === "http:" && host === ownHost)) return null;
  return u;
}

async function load(): Promise<void> {
  try {
    const res = await fetch(`${API_URL_SERVER}${API_PREFIX}/storefront/redirects`, {
      headers: { Accept: "application/json", ...(STOREFRONT_SERVER_KEY ? { "X-Storefront-Key": STOREFRONT_SERVER_KEY } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rules = (await res.json()) as Rule[];
    cache = { at: Date.now(), ttl: TTL_MS, map: new Map(rules.map((r) => [norm(r.from), r])) };
  } catch {
    // conserva la lista anterior y reintenta pronto
    cache = { at: Date.now(), ttl: FAILED_TTL_MS, map: cache?.map ?? new Map() };
  }
}

function refresh(): Promise<void> {
  inflight ??= load().finally(() => { inflight = null; });
  return inflight;
}

const current = (): RuleMap => cache?.map ?? new Map();

async function rules(event: NextFetchEvent): Promise<RuleMap> {
  if (cache) {
    if (Date.now() - cache.at >= cache.ttl) event.waitUntil(refresh()); // vieja: se devuelve ya y se refresca detrás
    return cache.map;
  }
  const loading = refresh();
  event.waitUntil(loading);
  await Promise.race([loading, new Promise((r) => setTimeout(r, FIRST_LOAD_WAIT_MS))]);
  return current();
}

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const rule = (await rules(event)).get(norm(req.nextUrl.pathname));
  if (!rule) return NextResponse.next();
  const status = rule.status === 302 ? 302 : 301;
  const to = rule.to.trim();

  // Se parte de req.nextUrl (no de req.url) para no filtrar el host interno del servidor.
  const dest = req.nextUrl.clone();
  if (isSafePath(to)) {
    const parsed = new URL(to, "http://internal.invalid");
    if (norm(parsed.pathname) === norm(req.nextUrl.pathname) && !parsed.search) return NextResponse.next(); // evita bucles
    dest.pathname = parsed.pathname;
    if (parsed.search) dest.search = parsed.search;
    dest.hash = parsed.hash;
  } else {
    const ext = externalTarget(to);
    if (!ext) return NextResponse.next();
    if (!ext.search) ext.search = req.nextUrl.search;
    return NextResponse.redirect(ext, status);
  }
  return NextResponse.redirect(dest, status);
}

export const config = {
  // Solo páginas de la tienda: fuera API, panel, pasarela de pruebas, /images, _next y archivos estáticos conocidos
  // (se excluyen por extensión, de modo que rutas con punto como /pages/v1.2 SÍ pueden tener redirección).
  matcher: [
    "/((?!api(?:/|$)|admin(?:/|$)|_next(?:/|$)|mock-checkout(?:/|$)|images(?:/|$)|.*\\.(?:js|mjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|txt|xml|json|webmanifest|woff2?|ttf|otf|pdf|mp4|webm)$).*)",
  ],
};
