import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiBase } from "@/lib/api/config";
import { visitorHeaders } from "@/lib/api/http";
import { resolveMediaUrl } from "@/lib/api/media";
import { SITE_URL } from "@/lib/site";
import { issueFrom } from "./messages";
import type { ApiIssue, CartState } from "./types";

/**
 * Server-only plumbing shared by the cart and checkout BFF routes (`/api/cart/**`, `/api/checkout/**`).
 *
 * The browser NEVER talks to the cart / checkout API: it talks to these route handlers, which keep the cart id and
 * its token (returned by the API only ONCE, when the cart is created) in an httpOnly cookie and call the API with
 * `X-Cart-Token`.
 */

export const CART_COOKIE = "dept_cart";
export const CART_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const API_TIMEOUT_MS = 12_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/* ── responses ───────────────────────────────────────────── */

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export function json<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function fail(issue: ApiIssue): NextResponse {
  return json({ error: issue }, issue.status >= 400 && issue.status < 600 ? issue.status : 502);
}

export function badRequest(message: string, fields?: Record<string, string>): NextResponse {
  return fail({ code: "VALIDATION_ERROR", message, status: 400, ...(fields ? { fields } : null) });
}

/* ── CSRF ────────────────────────────────────────────────── */

function allowedHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  const host = req.headers.get("host");
  if (host) hosts.add(host.toLowerCase());
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) hosts.add(forwarded.toLowerCase());
  try {
    hosts.add(new URL(SITE_URL).host.toLowerCase());
  } catch {
    /* invalid NEXT_PUBLIC_SITE_URL: only the request's own host counts */
  }
  return hosts;
}

/**
 * Mutations must come from this site's own pages: `Content-Type: application/json` (a cross-site form or a "simple"
 * request cannot send it without a CORS preflight, which these routes never allow) AND an `Origin` that matches the
 * host (or, for old clients that omit it, `Sec-Fetch-Site: same-origin`).
 */
export function guardMutation(req: Request): NextResponse | null {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(type)) {
    return fail({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Tipo de contenido no admitido.", status: 415 });
  }
  const origin = req.headers.get("origin");
  let ok = false;
  if (origin) {
    try {
      ok = allowedHosts(req).has(new URL(origin).host.toLowerCase());
    } catch {
      ok = false;
    }
  } else {
    ok = req.headers.get("sec-fetch-site") === "same-origin";
  }
  return ok ? null : fail(issueFrom("FORBIDDEN_ORIGIN", 403));
}

/** Parsed JSON object of a mutation, or a 400 response. */
export async function readJson(req: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return fail({ code: "PAYLOAD_TOO_LARGE", message: "La solicitud es demasiado grande.", status: 413 });
    const value: unknown = raw.trim() === "" ? {} : JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    return badRequest("La solicitud no es válida.");
  }
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

/* ── cart cookie ─────────────────────────────────────────── */

export interface CartCookie {
  id: string;
  token: string;
}

export async function readCartCookie(): Promise<CartCookie | null> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return null;
  const [id, token] = raw.split(".");
  return isUuid(id) && token && TOKEN_RE.test(token) ? { id, token } : null;
}

export async function writeCartCookie(cart: CartCookie): Promise<void> {
  (await cookies()).set(CART_COOKIE, `${cart.id}.${cart.token}`, cookieOptions(CART_MAX_AGE_SECONDS));
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).set(CART_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

/* ── API calls ───────────────────────────────────────────── */

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; issue: ApiIssue };

interface CallOptions {
  cartToken?: string;
  idempotencyKey?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

const SPANISH_FIELD_ISSUES: Record<string, string> = {
  too_small: "Es demasiado corto o está vacío.",
  too_big: "Es demasiado largo.",
  invalid_format: "El formato no es válido.",
  invalid_type: "Este dato es obligatorio.",
  invalid_value: "El valor no es válido.",
};

function fieldMessage(message: string, code: string): string {
  if (/phone/i.test(message)) return "Introduce un teléfono válido (7 a 20 dígitos, puede empezar por +).";
  if (/email/i.test(message)) return "Introduce un correo electrónico válido.";
  if (/characters/i.test(message)) return "Contiene caracteres no permitidos.";
  return SPANISH_FIELD_ISSUES[code] ?? "El valor no es válido.";
}

/** Calls the storefront API from the server. Never throws: network failures come back as `status: 0`. */
export async function callApi<T>(req: Request, method: string, path: string, options: CallOptions = {}): Promise<ApiResult<T>> {
  const url = new URL(`${apiBase()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { Accept: "application/json", ...visitorHeaders(req) };
  const key = process.env.STOREFRONT_SERVER_KEY;
  if (key) headers["X-Storefront-Key"] = key;
  if (options.cartToken) headers["X-Cart-Token"] = options.cartToken;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, issue: issueFrom("NETWORK", 0) };
  }

  if (res.ok) {
    if (res.status === 204) return { ok: true, status: 204, data: undefined as T };
    try {
      return { ok: true, status: res.status, data: (await res.json()) as T };
    } catch {
      return { ok: false, issue: issueFrom("BAD_JSON", 502) };
    }
  }

  let code: string | null = null;
  let details: unknown = null;
  try {
    const body = (await res.json()) as { code?: string; details?: unknown };
    code = typeof body.code === "string" ? body.code : null;
    details = body.details ?? null;
  } catch {
    /* non-JSON error body */
  }

  let fields: Record<string, string> | undefined;
  let detailObject: Record<string, unknown> | null = null;
  if (Array.isArray(details)) {
    fields = {};
    for (const entry of details) {
      if (entry && typeof entry === "object") {
        const e = entry as { path?: unknown; message?: unknown; code?: unknown };
        const path = typeof e.path === "string" && e.path ? e.path : "_";
        if (!(path in fields)) fields[path] = fieldMessage(String(e.message ?? ""), String(e.code ?? ""));
      }
    }
  } else if (details && typeof details === "object") {
    detailObject = details as Record<string, unknown>;
  }
  return { ok: false, issue: issueFrom(code, res.status, detailObject, fields) };
}

/* ── cart view ───────────────────────────────────────────── */

interface ApiQuoteLine {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: boolean;
  maxQuantity: number | null;
}

export interface ApiCartResponse {
  id: string;
  discountCode: string | null;
  itemCount: number;
  quote: {
    lines: ApiQuoteLine[];
    subtotal: number;
    discountTotal: number;
    discount: { code: string; type: "percent" | "fixed" | "free_shipping"; amount: number } | null;
    shippingTotal: number;
    taxTotal: number;
    total: number;
    warnings: { code: "VARIANT_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "DISCOUNT_INVALID"; message: string; variantId?: string }[];
  };
}

const WARNING_COPY: Record<string, string> = {
  VARIANT_UNAVAILABLE: "Este producto ya no está disponible.",
  INSUFFICIENT_STOCK: "No hay suficiente inventario para la cantidad elegida.",
  DISCOUNT_INVALID: "El código de descuento ya no se puede aplicar.",
};

export function cartStateFrom(cart: ApiCartResponse): CartState {
  const q = cart.quote;
  return {
    cartId: cart.id,
    itemCount: cart.itemCount,
    discountCode: cart.discountCode,
    discount: q.discount,
    lines: q.lines.map((l) => ({
      variantId: l.variantId,
      productTitle: l.productTitle,
      variantTitle: l.variantTitle,
      imageUrl: resolveMediaUrl(l.imageUrl),
      unitPrice: l.unitPrice,
      compareAtPrice: l.compareAtPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      available: l.available,
      maxQuantity: l.maxQuantity,
    })),
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    shippingTotal: q.shippingTotal,
    taxTotal: q.taxTotal,
    total: q.total,
    taxIncluded: q.total === q.subtotal - q.discountTotal + q.shippingTotal,
    warnings: q.warnings.map((w) => ({ code: w.code, message: WARNING_COPY[w.code] ?? w.message, variantId: w.variantId })),
  };
}

/** True when the API says the cart is gone (expired, never existed, token rotated): the cookie is dead weight. */
export const isCartGone = (issue: ApiIssue) => issue.status === 404 || issue.code === "CART_CONVERTED";
