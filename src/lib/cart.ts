"use client";

import { useMemo, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ApiCart, ApiCartCreated, ApiCartLine, ApiQuote } from "@/lib/api/types";

/**
 * Carrito conectado a la API (`/api/v1/storefront/carts`).
 *
 * - El carrito se crea al añadir el primer artículo; la API devuelve `{ id, token }` UNA sola vez, así que
 *   ambos se guardan en `localStorage` y el token viaja en `X-Cart-Token`.
 * - Los precios, impuestos y avisos (stock, límites) vienen siempre de la API (`quote`); el cliente no calcula nada.
 * - Store externo + `useSyncExternalStore`: hidratación segura (el primer pintado es un carrito vacío) y compartido
 *   por todos los componentes.
 */

const KEY = "dept-cart-v2";

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
  available: boolean;
  maxQuantity: number;
  /** handle del producto (para enlazar a su ficha); la API de carrito no lo devuelve, se guarda al añadir */
  handle?: string;
}

interface State {
  id: string | null;
  token: string | null;
  quote: ApiQuote | null;
  /** variantId → handle del producto */
  handles: Record<string, string>;
  discountCode: string | null;
  /** operación en curso */
  busy: boolean;
  /** primera carga resuelta */
  ready: boolean;
  error: string | null;
}

const INITIAL: State = { id: null, token: null, quote: null, handles: {}, discountCode: null, busy: false, ready: false, error: null };
let state: State = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function persist() {
  try {
    if (state.id && state.token) window.localStorage.setItem(KEY, JSON.stringify({ id: state.id, token: state.token, handles: state.handles }));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento bloqueado: el carrito vive solo en memoria */
  }
}

const headers = (token: string) => ({ "X-Cart-Token": token });
const messageOf = (e: unknown): string => (e instanceof ApiError ? (e.status === 429 ? "Demasiadas acciones seguidas. Espera un momento." : e.message) : "No se pudo actualizar el carrito.");

function apply(cart: ApiCart) {
  emit({ quote: cart.quote, discountCode: cart.discountCode, error: null });
}

/** Lee el carrito guardado y lo valida contra la API (si venció o no existe, empieza de cero). */
async function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  let saved: { id?: string; token?: string; handles?: Record<string, string> } = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as typeof saved;
  } catch {
    /* corrupto */
  }
  if (typeof saved.id !== "string" || typeof saved.token !== "string") return emit({ ready: true });
  emit({ id: saved.id, token: saved.token, handles: saved.handles && typeof saved.handles === "object" ? saved.handles : {} });
  try {
    apply(await apiFetch<ApiCart>(`/storefront/carts/${saved.id}`, { headers: headers(saved.token) }));
  } catch (e) {
    if (e instanceof ApiError && [400, 401, 403, 404, 410].includes(e.status)) {
      emit({ id: null, token: null, quote: null, handles: {}, discountCode: null });
      persist();
    } else {
      emit({ error: messageOf(e) });
    }
  }
  emit({ ready: true });
}

async function ensureCart(): Promise<{ id: string; token: string }> {
  if (state.id && state.token) return { id: state.id, token: state.token };
  const created = await apiFetch<ApiCartCreated>("/storefront/carts", { method: "POST", body: {} });
  emit({ id: created.id, token: created.token });
  persist();
  return { id: created.id, token: created.token };
}

async function run(fn: (c: { id: string; token: string }) => Promise<ApiCart | void>, opts: { create?: boolean } = {}): Promise<boolean> {
  emit({ busy: true, error: null });
  try {
    const cart = opts.create ? await ensureCart() : state.id && state.token ? { id: state.id, token: state.token } : null;
    if (!cart) return false;
    const result = await fn(cart);
    if (result) apply(result);
    return true;
  } catch (e) {
    if (e instanceof ApiError && [404, 410].includes(e.status)) {
      emit({ id: null, token: null, quote: null, handles: {}, discountCode: null });
      persist();
    }
    emit({ error: messageOf(e) });
    return false;
  } finally {
    emit({ busy: false });
  }
}

/* ── acciones ─────────────────────────────────────────────── */

/** Añade una variante (talla). Devuelve `false` si la API la rechazó (sin stock, límite…); el motivo queda en `error`. */
export async function addToCart(variantId: string, quantity = 1, handle?: string): Promise<boolean> {
  if (handle) {
    emit({ handles: { ...state.handles, [variantId]: handle } });
    persist();
  }
  return run((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines`, { method: "POST", headers: headers(c.token), body: { variantId, quantity } }), { create: true });
}

export const setLineQty = (variantId: string, quantity: number) =>
  quantity <= 0
    ? removeFromCart(variantId)
    : run((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines/${variantId}`, { method: "PATCH", headers: headers(c.token), body: { quantity } }));

export const removeFromCart = (variantId: string) =>
  run((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/lines/${variantId}`, { method: "DELETE", headers: headers(c.token) }));

export const applyDiscount = (code: string | null) =>
  run((c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}/discount`, { method: "PUT", headers: headers(c.token), body: { code } }));

/** Vacía el carrito local (p. ej. tras pagar): el carrito del servidor queda convertido en pedido. */
export function resetCart() {
  emit({ id: null, token: null, quote: null, handles: {}, discountCode: null, error: null });
  persist();
}

/** Credenciales del carrito actual para el checkout. */
export const getCartAuth = (): { id: string; token: string } | null => (state.id && state.token ? { id: state.id, token: state.token } : null);
export const refreshCart = () => run(async (c) => apiFetch<ApiCart>(`/storefront/carts/${c.id}`, { headers: headers(c.token) }));

/* ── hook ─────────────────────────────────────────────────── */

function subscribe(listener: () => void) {
  listeners.add(listener);
  void start();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    started = false;
    state = INITIAL;
    void start();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

const toItem = (l: ApiCartLine, handles: Record<string, string>): CartItem => ({
  handle: handles[l.variantId],
  variantId: l.variantId, productId: l.productId, name: l.productTitle, size: l.variantTitle, image: l.imageUrl,
  unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, qty: l.quantity, total: l.lineTotal, available: l.available, maxQuantity: l.maxQuantity,
});

export function useCart() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const items = (s.quote?.lines ?? []).map((l) => toItem(l, s.handles));
    return {
      items,
      /** unidades totales */
      count: items.reduce((n, i) => n + i.qty, 0),
      /** subtotal en COP (según la API) */
      subtotal: s.quote?.subtotal ?? 0,
      quote: s.quote,
      warnings: s.quote?.warnings ?? [],
      discountCode: s.discountCode,
      busy: s.busy,
      ready: s.ready,
      error: s.error,
      add: addToCart,
      setQty: setLineQty,
      remove: removeFromCart,
      applyDiscount,
      reset: resetCart,
    };
  }, [s]);
}
