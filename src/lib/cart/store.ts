"use client";

import { useMemo, useSyncExternalStore } from "react";
import { issueFrom } from "./messages";
import { EMPTY_CART_STATE, type ApiIssue, type CartLineView, type CartState } from "./types";

/**
 * Client side of the cart. The cart itself lives on the SERVER (API `/storefront/carts`, reached only through the
 * Next route handlers `/api/cart/**`, which keep its token in an httpOnly cookie). This store mirrors it:
 *
 * - quantities / removals are applied optimistically and rolled back (by re-reading the server) if the API refuses;
 * - every price shown comes from the server's quote; the only prices not coming from it are the ones of a line that
 *   is still being added (marked `pending`), taken from the catalogue props the page was rendered with;
 * - mutations are serialised, so two quick clicks can never race each other;
 * - other tabs are told to re-read through a BroadcastChannel.
 */

export interface CartSnapshot {
  cart: CartState;
  /** the first read of the server cart finished (before it, the cart shows as empty / loading) */
  ready: boolean;
  /** mutations in flight */
  busy: number;
  /** last error of a cart action, already in Spanish */
  error: ApiIssue | null;
  /** neutral message (e.g. result of migrating the old local cart) */
  notice: string | null;
}

export interface AddToCartInput {
  variantId: string;
  handle: string;
  size: string;
  name: string;
  price: number;
  image?: string;
  imageAlt?: string;
  /** kept for backwards compatibility: the server decides the real limit */
  max?: number;
}

export const MAX_LINE_QUANTITY = 20;
const LEGACY_KEY = "dept-cart-v2";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STALE_MS = 60_000;

const INITIAL: CartSnapshot = { cart: EMPTY_CART_STATE, ready: false, busy: 0, error: null, notice: null };

let snap: CartSnapshot = INITIAL;
let started = false;
let lastRead = 0;
let chain: Promise<unknown> = Promise.resolve();
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<CartSnapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

/* ── shipping quote (set by the checkout once a shipping rate is chosen) ─────────────────── */

export interface ShippingQuoteParams {
  shippingRateId: string;
  department: string;
  /** only needed to validate single-use discount codes */
  email?: string;
}

let quoteParams: ShippingQuoteParams | null = null;

function quoteUrl(): string {
  if (!quoteParams) return "/api/cart";
  const q = new URLSearchParams({ shippingRateId: quoteParams.shippingRateId, department: quoteParams.department });
  return `/api/cart?${q}`;
}

/** Asks the server to quote the cart with shipping to a destination (null = back to the plain cart). */
export function setShippingQuote(next: ShippingQuoteParams | null): Promise<void> {
  const same = JSON.stringify(next) === JSON.stringify(quoteParams);
  quoteParams = next;
  if (same) return Promise.resolve();
  start();
  return refresh();
}

/* ── network ─────────────────────────────────────────────── */

type Outcome = { ok: true; cart: CartState } | { ok: false; issue: ApiIssue };

async function call(method: string, url: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<Outcome> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: { Accept: "application/json", ...(method !== "GET" ? { "Content-Type": "application/json" } : null), ...extraHeaders },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    type Body = { cart?: CartState; error?: ApiIssue };
    let data = null as Body | null;
    try {
      data = (await res.json()) as Body;
    } catch {
      /* not JSON */
    }
    if (res.ok && data?.cart) return { ok: true, cart: data.cart };
    return { ok: false, issue: data?.error ?? issueFrom(null, res.status || 0) };
  } catch {
    return { ok: false, issue: issueFrom("NETWORK", 0) };
  }
}

function broadcast() {
  try {
    channel?.postMessage("changed");
  } catch {
    /* closed channel */
  }
}

/* ── reading ─────────────────────────────────────────────── */

async function refresh(): Promise<void> {
  // the e-mail is personal data: it travels in a header, never in the URL (browser history, proxies, access logs)
  const r = await call("GET", quoteUrl(), undefined, quoteParams?.email ? { "X-Quote-Email": encodeURIComponent(quoteParams.email) } : undefined);
  lastRead = Date.now();
  if (r.ok) set({ cart: r.cart, ready: true });
  else {
    // the chosen rate stopped being valid for that destination: go back to the plain cart
    if (quoteParams && r.issue.code === "SHIPPING_RATE_INVALID") quoteParams = null;
    set({ ready: true, error: snap.cart.lines.length === 0 ? snap.error : r.issue });
  }
}

async function migrateLegacyCart(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGACY_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const old = (Array.isArray(parsed) ? parsed : []).filter(
    (l): l is { variantId: string; handle?: string; size?: string; qty: number; name?: string } =>
      !!l && typeof l === "object" && UUID_RE.test(String((l as { variantId?: unknown }).variantId)) && Number.isInteger((l as { qty?: unknown }).qty),
  );
  if (old.length === 0) return;
  if (snap.cart.lines.length > 0) {
    set({ notice: "Descartamos el carrito guardado en este navegador porque ya tienes uno activo." });
    return;
  }
  const lost: string[] = [];
  for (const line of old) {
    // same queue as every other mutation: it cannot interleave with the visitor's own clicks
    const issue = await mutate(null, () =>
      call("POST", "/api/cart", { variantId: line.variantId, quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, line.qty)) }),
    );
    if (issue) lost.push(line.name ?? "un producto");
  }
  set({
    error: null, // the notice already explains what was lost
    notice: lost.length
      ? `Recuperamos tu carrito anterior, pero no pudimos añadir: ${lost.join(", ")} (sin inventario o ya no disponible).`
      : "Recuperamos los productos de tu carrito anterior.",
  });
  broadcast();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    window.localStorage.removeItem("dept-cart-meta"); // old variant→handle map: the quote carries the handle now
  } catch {
    /* blocked storage */
  }
  try {
    channel = new BroadcastChannel("dept-cart");
    channel.onmessage = () => void refresh();
  } catch {
    channel = null;
  }
  window.addEventListener("focus", () => {
    if (Date.now() - lastRead > STALE_MS && snap.busy === 0) void refresh();
  });
  void refresh().then(() => migrateLegacyCart());
}

/* ── mutations ───────────────────────────────────────────── */

type Optimistic = (cart: CartState) => CartState;

function withTotalsKept(cart: CartState, lines: CartLineView[]): CartState {
  return { ...cart, lines, itemCount: lines.reduce((n, l) => n + l.quantity, 0) };
}

/**
 * Applies `optimistic` now, then asks the server (after any earlier mutation). Resolves with the error, if any.
 * A refusal resyncs from the server instead of guessing the previous state, which also fixes anything that changed
 * meanwhile (stock, another tab).
 */
function mutate(optimistic: Optimistic | null, send: () => Promise<Outcome>): Promise<ApiIssue | null> {
  set({ busy: snap.busy + 1, error: null, notice: null, ...(optimistic ? { cart: optimistic(snap.cart) } : null) });
  const run = async (): Promise<ApiIssue | null> => {
    const r = await send();
    const remaining = snap.busy - 1;
    if (r.ok) {
      // mutations answer without shipping: with a destination chosen, re-quote once the queue is empty
      if (remaining === 0 && quoteParams) {
        set({ busy: remaining });
        await refresh();
        broadcast();
        return null;
      }
      // while more mutations are queued the screen already shows their optimistic result: the last answer wins
      set({ busy: remaining, ...(remaining === 0 ? { cart: r.cart } : null) });
      lastRead = Date.now();
      broadcast();
      return null;
    }
    set({ busy: remaining, error: r.issue });
    if (r.issue.details?.reset) set({ cart: EMPTY_CART_STATE });
    else if (remaining === 0) await refresh();
    return r.issue;
  };
  const result = chain.then(run, run);
  chain = result.catch(() => null);
  return result;
}

export function addToCart(input: AddToCartInput, qty = 1): boolean {
  if (typeof window === "undefined") return false;
  if (!UUID_RE.test(input.variantId) || !input.handle || !input.name) return false;
  start();
  const quantity = Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(qty) || 1));
  void mutate(
    (cart) => {
      const existing = cart.lines.find((l) => l.variantId === input.variantId);
      const lines: CartLineView[] = existing
        ? cart.lines.map((l) =>
            l === existing ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity), pending: true } : l,
          )
        : [
            ...cart.lines,
            {
              variantId: input.variantId,
              productHandle: input.handle,
              productTitle: input.name,
              variantTitle: input.size,
              imageUrl: input.image ?? null,
              unitPrice: input.price,
              compareAtPrice: null,
              quantity,
              lineTotal: input.price * quantity,
              available: true,
              maxQuantity: null,
              pending: true,
            },
          ];
      return withTotalsKept(cart, lines);
    },
    () => call("POST", "/api/cart", { variantId: input.variantId, quantity }),
  );
  return true;
}

export function setVariantQty(variantId: string, qty: number): Promise<ApiIssue | null> {
  start();
  const quantity = Math.max(0, Math.min(MAX_LINE_QUANTITY, Math.floor(qty) || 0));
  return mutate(
    (cart) => {
      const lines =
        quantity === 0
          ? cart.lines.filter((l) => l.variantId !== variantId)
          : cart.lines.map((l) => (l.variantId === variantId ? { ...l, quantity, pending: true } : l));
      return withTotalsKept(cart, lines);
    },
    () => call("PATCH", "/api/cart", { variantId, quantity }),
  );
}

export function removeVariant(variantId: string): Promise<ApiIssue | null> {
  start();
  return mutate(
    (cart) =>
      withTotalsKept(
        cart,
        cart.lines.filter((l) => l.variantId !== variantId),
      ),
    () => call("DELETE", "/api/cart", { variantId }),
  );
}

export function applyDiscount(code: string, email?: string): Promise<ApiIssue | null> {
  start();
  return mutate(null, () => call("PUT", "/api/cart/discount", { code, ...(email ? { email } : null) }));
}

export function removeDiscount(): Promise<ApiIssue | null> {
  start();
  return mutate(null, () => call("DELETE", "/api/cart/discount", {}));
}

/** Re-reads the server cart (e.g. after the order was paid and the cart cookie was dropped). */
export function refreshCart(): Promise<void> {
  start();
  return refresh();
}

/** Deletes the whole cart on the server. */
export function clearCart(): Promise<ApiIssue | null> {
  start();
  return mutate(
    (cart) => withTotalsKept({ ...cart, discount: null, discountCode: null }, []),
    () => call("DELETE", "/api/cart", {}),
  );
}

export function dismissCartMessage() {
  set({ error: null, notice: null });
}

/** Called when a page already knows the cart changed (e.g. restored from an order). */
export function setCartState(cart: CartState) {
  set({ cart, ready: true });
  broadcast();
}

/* ── legacy name-based API (kept for the existing components) ─ */

function variantOf(handle: string, size: string): string | null {
  const match = snap.cart.lines.find((l) => l.productHandle === handle && (l.variantTitle === size || (size === "" && DEFAULT_VARIANT_TITLES.has(l.variantTitle.trim().toLowerCase()))));
  return match?.variantId ?? null;
}

export function setLineQty(handle: string, size: string, qty: number) {
  const id = variantOf(handle, size);
  if (id) void setVariantQty(id, qty);
}

export function removeFromCart(handle: string, size: string) {
  const id = variantOf(handle, size);
  if (id) void removeVariant(id);
}

/* ── hook ────────────────────────────────────────────────── */

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snap;
const getServerSnapshot = () => INITIAL;

export interface CartItem {
  variantId: string;
  handle: string;
  /** variant label ("M"); "" when the product has a single default variant */
  size: string;
  qty: number;
  /** most units of this line the cart allows */
  max: number;
  name: string;
  /** unit price in COP, from the server's quote */
  price: number;
  compareAtPrice: number | null;
  image?: string;
  imageAlt: string;
  available: boolean;
  /** true while the server has not confirmed the line yet */
  pending: boolean;
  product: { name: string; images: string[]; imageLabel: string };
  /** line total in COP, from the server's quote */
  total: number;
}

const DEFAULT_VARIANT_TITLES = new Set(["default title", "default", "título predeterminado", "unico", "único"]);

export function useCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    const items: CartItem[] = current.cart.lines.map((line) => {
      const size = DEFAULT_VARIANT_TITLES.has(line.variantTitle.trim().toLowerCase()) ? "" : line.variantTitle;
      const image = line.imageUrl ?? undefined;
      return {
        variantId: line.variantId,
        handle: line.productHandle ?? "",
        size,
        qty: line.quantity,
        max: Math.max(1, Math.min(MAX_LINE_QUANTITY, line.maxQuantity ?? MAX_LINE_QUANTITY)),
        name: line.productTitle,
        price: line.unitPrice,
        compareAtPrice: line.compareAtPrice,
        image,
        imageAlt: line.productTitle,
        available: line.available,
        pending: line.pending === true,
        product: { name: line.productTitle, images: image ? [image] : [], imageLabel: line.productTitle },
        total: line.lineTotal,
      };
    });
    return {
      items,
      /** total units in the cart */
      count: current.cart.itemCount,
      /** server quote */
      cart: current.cart,
      subtotal: current.cart.subtotal,
      /** the first read of the server cart has finished */
      ready: current.ready,
      busy: current.busy > 0,
      error: current.error,
      notice: current.notice,
      add: addToCart,
      setQty: setLineQty,
      remove: removeFromCart,
      setVariantQty,
      removeVariant,
      applyDiscount,
      removeDiscount,
      refresh: refreshCart,
      clear: clearCart,
      dismiss: dismissCartMessage,
    };
  }, [current]);
}
