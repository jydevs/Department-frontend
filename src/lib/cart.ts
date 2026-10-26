"use client";

import { useMemo, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api/client";
import { ApiError, friendlyError } from "@/lib/api/errors";
import type { ApiCart, ApiCartCreated, ApiCartLine, ApiQuote, ApiQuoteWarning } from "@/lib/api/types";

/**
 * Carrito conectado a la API (`/api/v1/storefront/carts`).
 *
 * - El carrito se crea al añadir el primer artículo; la API devuelve `{ id, token }` UNA sola vez, así que
 *   ambos se guardan en `localStorage` y el token viaja en `X-Cart-Token`.
 * - Los precios, impuestos y avisos (stock, límites) vienen siempre de la API (`quote`); el cliente no calcula nada.
 * - Todas las mutaciones pasan por UNA cola serial (las respuestas se aplican en el orden en que se pidieron) y la
 *   creación del carrito es una sola promesa compartida (dos `add()` seguidos no crean dos carritos).
 * - Store externo + `useSyncExternalStore`: hidratación segura (el primer pintado es un carrito vacío) y compartido
 *   por todos los componentes. Un único listener `storage` (a nivel de módulo) sincroniza las pestañas.
 */

const KEY = "dept-cart-v2";
/** Tope de unidades por línea que impone la API (`CART_MAX_QUANTITY` del backend). */
export const CART_MAX_QUANTITY = 20;
/** Tras este tiempo un mensaje de error del carrito se descarta solo (no se queda pegado en otras pantallas). */
const ERROR_TTL_MS = 10_000;
const EXPIRED_MSG = "Tu carrito expiró. Vuelve a añadir tus productos.";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  /** talla / variante */
  size: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  qty: number;
  /** precio unitario × cantidad, en COP */
  total: number;
  /** ahorro de la línea frente al precio de comparación (0 si no hay) */
  savings: number;
  available: boolean;
  /** máximo comprable: stock disponible acotado por el tope por línea del carrito (20) */
  maxQuantity: number;
  /** `true` si el límite viene del stock (y no solo del tope por línea) */
  stockLimited: boolean;
  /** handle del producto (para enlazar a su ficha); la API de carrito no lo devuelve, se guarda al añadir */
  handle?: string;
}

/** Aviso del carrito ya traducido a español. */
export interface CartIssue {
  code: string;
  variantId?: string;
  text: string;
  /** impide pagar hasta que se corrija */
  blocking: boolean;
}

interface State {
  id: string | null;
  token: string | null;
  quote: ApiQuote | null;
  /** variantId → handle del producto */
  handles: Record<string, string>;
  discountCode: string | null;
  /** operaciones de escritura en curso (cola) */
  pending: number;
  /** primera carga resuelta (con éxito o con fallo) */
  ready: boolean;
  /** hay un carrito guardado pero no se pudo validar (red / servidor): no es un carrito vacío */
  loadFailed: boolean;
  error: string | null;
}

const INITIAL: State = { id: null, token: null, quote: null, handles: {}, discountCode: null, pending: 0, ready: false, loadFailed: false, error: null };
let state: State = INITIAL;
const listeners = new Set<() => void>();
let errorTimer: ReturnType<typeof setTimeout> | undefined;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function setError(error: string | null) {
  clearTimeout(errorTimer);
  emit({ error });
  if (error) errorTimer = setTimeout(() => state.error === error && emit({ error: null }), ERROR_TTL_MS);
}

function persist() {
  try {
    if (state.id && state.token) window.localStorage.setItem(KEY, JSON.stringify({ id: state.id, token: state.token, handles: state.handles }));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento bloqueado: el carrito vive solo en memoria */
  }
}

function readSaved(): { id: string; token: string; handles: Record<string, string> } | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { id?: unknown; token?: unknown; handles?: unknown } | null;
    if (!saved || typeof saved.id !== "string" || typeof saved.token !== "string") return null;
    const handles = saved.handles && typeof saved.handles === "object" && !Array.isArray(saved.handles) ? (saved.handles as Record<string, string>) : {};
    return { id: saved.id, token: saved.token, handles };
  } catch {
    return null; // corrupto
  }
}

const headers = (token: string) => ({ "X-Cart-Token": token });
const messageOf = (e: unknown): string => friendlyError(e, "No se pudo actualizar el carrito. Inténtalo de nuevo.");
/** El carrito guardado ya no sirve en el servidor (venció, no existe o el token no coincide). */
const isGoneOnLoad = (e: unknown): boolean => e instanceof ApiError && [400, 401, 403, 404, 410].includes(e.status);
/** Una mutación se rechazó porque el carrito venció o ya es un pedido (un 400 sería un dato inválido, no se borra nada). */
const isConverted = (e: unknown): boolean => e instanceof ApiError && e.code === "CART_CONVERTED";
const isGoneOnMutation = (e: unknown): boolean => (e instanceof ApiError && [404, 410].includes(e.status)) || isConverted(e);

function clearLocal(message: string | null) {
  emit({ id: null, token: null, quote: null, handles: {}, discountCode: null, loadFailed: false });
  persist();
  setError(message);
}

function apply(cart: ApiCart) {
  emit({ quote: cart.quote, discountCode: cart.discountCode, loadFailed: false });
  setError(null);
  // un código guardado que dejó de valer (venció, se agotó…) bloquearía el pago: se quita solo y se avisa
  const stale = cart.discountCode && cart.quote.warnings.some((w) => w.code === "DISCOUNT_INVALID");
  if (stale) {
    void enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/discount`, { method: "PUT", headers: headers(c.token), body: { code: null } })).then(() =>
      setError(`El código ${cart.discountCode} ya no es válido y se quitó de tu carrito.`),
    );
  }
}

/* ── arranque: leer el carrito guardado y validarlo ─────────── */

let startPromise: Promise<void> | null = null;

async function load(): Promise<void> {
  const saved = readSaved();
  if (!saved) {
    emit({ ready: true });
    return;
  }
  emit({ id: saved.id, token: saved.token, handles: saved.handles });
  try {
    apply(await apiFetch<ApiCart>(`/storefront/carts/${saved.id}`, { headers: headers(saved.token) }));
  } catch (e) {
    if (isGoneOnLoad(e)) {
      clearLocal(EXPIRED_MSG);
    } else {
      // red caída o error 5xx: el carrito sigue siendo válido, solo no pudimos verlo. NO se da por "arrancado":
      // se reintenta al reenfocar la pestaña, al pulsar "Reintentar" o en la siguiente acción.
      startPromise = null;
      emit({ loadFailed: true });
      setError(messageOf(e));
    }
  }
  emit({ ready: true });
}

function start(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // nunca de forma síncrona: `start()` se llama desde `subscribe` (fase de commit) y emitir ahí actualizaría componentes aún sin montar
  startPromise ??= Promise.resolve().then(load);
  return startPromise;
}

/** Vuelve a intentar validar el carrito guardado tras un fallo de red / servidor. */
export function retryCart(): Promise<void> {
  if (!state.loadFailed) return start();
  emit({ ready: false });
  return start();
}

/* ── cola de mutaciones y creación única ─────────────────── */

let queue: Promise<unknown> = Promise.resolve();
let creating: Promise<{ id: string; token: string }> | null = null;

function ensureCart(): Promise<{ id: string; token: string }> {
  if (state.id && state.token) return Promise.resolve({ id: state.id, token: state.token });
  creating ??= apiFetch<ApiCartCreated>("/storefront/carts", { method: "POST", body: {} })
    .then((created) => {
      emit({ id: created.id, token: created.token });
      persist();
      return { id: created.id, token: created.token };
    })
    .finally(() => {
      creating = null;
    });
  return creating;
}

type Op = (c: { id: string; token: string }) => Promise<ApiCart | void>;

/** Encola una operación: se ejecutan una tras otra y sus respuestas se aplican en orden. Devuelve si tuvo éxito. */
function enqueue(fn: Op, opts: { create?: boolean } = {}): Promise<boolean> {
  emit({ pending: state.pending + 1 });
  setError(null);
  const task = async (): Promise<boolean> => {
    try {
      await start();
      if (state.loadFailed) await retryCart(); // la carga inicial falló por red: se reintenta con esta acción
      for (let attempt = 0; ; attempt++) {
        const cart = opts.create ? await ensureCart() : state.id && state.token ? { id: state.id, token: state.token } : null;
        if (!cart) return false;
        try {
          const result = await fn(cart);
          if (result) apply(result);
          return true;
        } catch (e) {
          // al añadir sobre un carrito que ya es un pedido (p. ej. se volvió atrás desde la pasarela) se empieza uno nuevo
          if (opts.create && isGoneOnMutation(e) && attempt === 0) {
            clearLocal(null);
            continue;
          }
          throw e;
        }
      }
    } catch (e) {
      if (isGoneOnMutation(e) && state.id) clearLocal(isConverted(e) ? "Ese carrito ya se convirtió en un pedido. Empieza uno nuevo." : EXPIRED_MSG);
      else setError(messageOf(e));
      return false;
    } finally {
      emit({ pending: state.pending - 1 });
    }
  };
  const result = queue.then(task, task);
  queue = result;
  return result;
}

/* ── acciones ─────────────────────────────────────────────── */

/** Añade una variante (talla). Devuelve `false` si la API la rechazó (sin stock, límite…); el motivo queda en `error`. */
export function addToCart(variantId: string, quantity = 1, handle?: string): Promise<boolean> {
  if (handle && state.handles[variantId] !== handle) {
    emit({ handles: { ...state.handles, [variantId]: handle } });
    persist();
  }
  return enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines`, { method: "POST", headers: headers(c.token), body: { variantId, quantity } }), { create: true });
}

export const removeFromCart = (variantId: string): Promise<boolean> =>
  enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines/${variantId}`, { method: "DELETE", headers: headers(c.token) }));

export const setLineQty = (variantId: string, quantity: number): Promise<boolean> =>
  quantity <= 0
    ? removeFromCart(variantId)
    : enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines/${variantId}`, { method: "PATCH", headers: headers(c.token), body: { quantity } }));

export const applyDiscount = (code: string | null): Promise<boolean> =>
  enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/discount`, { method: "PUT", headers: headers(c.token), body: { code } }));

/** Vuelve a pedir el carrito a la API (precios, stock y avisos al día). */
export const refreshCart = (): Promise<boolean> => enqueue((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}`, { headers: headers(c.token) }));

/**
 * Vacía el carrito local (p. ej. tras confirmar el pago): el carrito del servidor ya es un pedido.
 * `message` se muestra como aviso (p. ej. carrito vencido).
 */
export function resetCart(message: string | null = null) {
  clearLocal(message);
}

/** Descarta el carrito convertido en pedido y crea uno nuevo con las mismas líneas (para "empezar de nuevo"). */
export async function rebuildCartFrom(lines: { variantId: string; qty: number }[]): Promise<boolean> {
  resetCart();
  let ok = true;
  for (const l of lines) ok = (await addToCart(l.variantId, l.qty)) && ok;
  return ok;
}

/**
 * Tras cancelar el pedido pendiente: el carrito del servidor ya es un pedido (no admite cambios), así que se recrea con las
 * MISMAS líneas que muestra el carrito local (que no se vacía hasta que el pago se confirma). Si el carrito local ya es otro
 * (`cartId` distinto) no se toca. Devuelve `false` si alguna línea no se pudo volver a añadir (p. ej. sin stock).
 */
export async function restoreCartAfterCancel(cartId: string): Promise<boolean> {
  await start();
  if (!cartId || state.id !== cartId) return true;
  const lines = (state.quote?.lines ?? []).map((l) => ({ variantId: l.variantId, qty: l.quantity }));
  if (lines.length === 0) { resetCart(); return true; }
  return rebuildCartFrom(lines);
}

/** Quita el mensaje de error actual (al abrir el carrito o el checkout no deben verse errores de otra pantalla). */
export function clearCartError() {
  if (state.error) setError(null);
}

/** Último mensaje de error del carrito (p. ej. el motivo de un código de descuento rechazado). */
export const getCartError = (): string | null => state.error;

/** Credenciales del carrito actual para el checkout. */
export const getCartAuth = (): { id: string; token: string } | null => (state.id && state.token ? { id: state.id, token: state.token } : null);

/* ── avisos de la cotización (siempre en español) ──────────── */

const lineLabel = (l: ApiCartLine) => `«${l.productTitle}»${l.variantTitle ? ` (${l.variantTitle})` : ""}`;

/** Traduce los `warnings` de la cotización por `code`; la API ya no envía texto utilizable en español. */
export function quoteIssues(quote: ApiQuote | null): CartIssue[] {
  if (!quote) return [];
  const out: CartIssue[] = [];
  const byVariant = new Map(quote.lines.map((l) => [l.variantId, l]));
  const seen = new Set<string>();
  const push = (i: CartIssue) => {
    const k = `${i.code}:${i.variantId ?? ""}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(i);
    }
  };
  for (const w of quote.warnings as ApiQuoteWarning[]) {
    const line = w.variantId ? byVariant.get(w.variantId) : undefined;
    const what = line ? lineLabel(line) : "Uno de los productos";
    if (w.code === "VARIANT_UNAVAILABLE") {
      push({ code: w.code, variantId: w.variantId, blocking: true, text: `${what} ya no está disponible. Elimínalo del carrito para continuar.` });
    } else if (w.code === "INSUFFICIENT_STOCK") {
      const left = line?.maxQuantity ?? Number(/(\d+)/.exec(w.message)?.[1] ?? NaN);
      const detail = Number.isFinite(left) ? (left <= 0 ? "está agotado" : `solo ${left === 1 ? "queda 1 unidad" : `quedan ${left} unidades`}`) : "no hay stock suficiente";
      push({ code: w.code, variantId: w.variantId, blocking: true, text: `De ${what} ${detail}. Reduce la cantidad o elimínalo del carrito.` });
    } else if (w.code === "DISCOUNT_INVALID") {
      push({ code: w.code, blocking: false, text: "El código de descuento ya no se puede aplicar." });
    } else {
      push({ code: w.code, variantId: w.variantId, blocking: false, text: "Revisa tu carrito: hay un producto con cambios." });
    }
  }
  // una línea marcada como no disponible sin aviso asociado también bloquea el pago
  for (const l of quote.lines) {
    if (!l.available && !out.some((i) => i.variantId === l.variantId)) {
      push({ code: "VARIANT_UNAVAILABLE", variantId: l.variantId, blocking: true, text: `${lineLabel(l)} no está disponible. Elimínalo del carrito para continuar.` });
    }
  }
  return out;
}

/* ── hook ─────────────────────────────────────────────────── */

let storageBound = false;
function onStorage(e: StorageEvent) {
  if (e.key !== KEY && e.key !== null) return;
  const saved = readSaved();
  if (saved && saved.id === state.id && saved.token === state.token) {
    emit({ handles: { ...state.handles, ...saved.handles } }); // solo cambiaron los handles
    return;
  }
  // otra pestaña creó, vació o cambió el carrito: se vuelve a leer y validar
  startPromise = null;
  emit({ ...INITIAL, ready: false });
  void start();
}
function onFocus() {
  if (state.loadFailed && state.pending === 0) void retryCart();
}
function bind() {
  if (storageBound) return;
  storageBound = true;
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
}
function unbind() {
  if (!storageBound) return;
  storageBound = false;
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("focus", onFocus);
  document.removeEventListener("visibilitychange", onFocus);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  bind();
  void start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) unbind();
  };
}
const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

const toItem = (l: ApiCartLine, handles: Record<string, string>): CartItem => {
  const cap = Math.min(l.maxQuantity ?? CART_MAX_QUANTITY, CART_MAX_QUANTITY);
  return {
    handle: handles[l.variantId],
    variantId: l.variantId, productId: l.productId, name: l.productTitle, size: l.variantTitle, image: l.imageUrl,
    unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, qty: l.quantity, total: l.lineTotal,
    savings: l.compareAtPrice && l.compareAtPrice > l.unitPrice ? (l.compareAtPrice - l.unitPrice) * l.quantity : 0,
    available: l.available, maxQuantity: cap, stockLimited: l.maxQuantity !== null && l.maxQuantity < CART_MAX_QUANTITY,
  };
};

export function useCart() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const items = (s.quote?.lines ?? []).map((l) => toItem(l, s.handles));
    const issues = quoteIssues(s.quote);
    return {
      items,
      /** unidades totales */
      count: items.reduce((n, i) => n + i.qty, 0),
      /** subtotal en COP (según la API) */
      subtotal: s.quote?.subtotal ?? 0,
      /** ahorro total frente a los precios de comparación */
      savings: items.reduce((n, i) => n + i.savings, 0),
      quote: s.quote,
      /** avisos traducidos (stock, disponibilidad, código de descuento) */
      issues,
      /** hay algo que corregir antes de pagar */
      invalid: issues.some((i) => i.blocking),
      discountCode: s.discountCode,
      /** hay operaciones en curso (añadir, cambiar cantidad…) */
      busy: s.pending > 0,
      ready: s.ready,
      /** hay un carrito guardado que no se pudo cargar (red / servidor caído) */
      loadFailed: s.loadFailed,
      error: s.error,
      add: addToCart,
      setQty: setLineQty,
      remove: removeFromCart,
      applyDiscount,
      reset: resetCart,
      retry: retryCart,
      refresh: refreshCart,
    };
  }, [s]);
}
