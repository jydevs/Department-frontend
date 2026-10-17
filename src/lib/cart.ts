"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Client-side cart. A tiny external store persisted in localStorage and read
 * through `useSyncExternalStore`, so it is hydration-safe (server / first paint
 * = empty cart) and shared across every component.
 *
 * Each line is resolved against the API's variant when it is ADDED (the product
 * page / quick-add already hold the real variant): we keep the variant id (what
 * checkout will send to the backend) plus a snapshot of name, price and photo,
 * so the drawer renders without fetching anything.
 */

export interface CartLine {
  /** API variant id */
  variantId: string;
  handle: string;
  /** variant label shown as "Talla …" */
  size: string;
  qty: number;
  /** most units of this line the cart allows (product-detail `maxQuantity`) */
  max: number;
  name: string;
  /** unit price in COP at the time it was added */
  price: number;
  image?: string;
  imageAlt: string;
}

export interface CartItem extends CartLine {
  product: { name: string; images: string[]; imageLabel: string };
  /** unit price × qty, in COP */
  total: number;
}

export interface AddToCartInput {
  variantId: string;
  handle: string;
  size: string;
  name: string;
  price: number;
  image?: string;
  imageAlt?: string;
  max?: number;
}

const KEY = "dept-cart-v2";
const DEFAULT_MAX = 10;
const HARD_MAX = 50;
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function clampQty(qty: number, max: number): number {
  return Math.min(max, Math.max(1, Math.floor(qty) || 1));
}

function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return EMPTY;
  const out: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.variantId !== "string" ||
      typeof e.handle !== "string" ||
      typeof e.size !== "string" ||
      typeof e.name !== "string" ||
      typeof e.qty !== "number" ||
      typeof e.price !== "number" ||
      !Number.isFinite(e.qty) ||
      !Number.isFinite(e.price) ||
      e.price < 0
    ) {
      continue;
    }
    const max = typeof e.max === "number" && Number.isFinite(e.max) ? Math.min(HARD_MAX, Math.max(1, Math.floor(e.max))) : DEFAULT_MAX;
    const image = typeof e.image === "string" && /^(\/(?!\/)|https?:\/\/)/.test(e.image) ? e.image : undefined;
    out.push({
      variantId: e.variantId,
      handle: e.handle,
      size: e.size,
      qty: clampQty(e.qty, max),
      max,
      name: e.name,
      price: e.price,
      image,
      imageAlt: typeof e.imageAlt === "string" ? e.imageAlt : e.name,
    });
  }
  return out.length ? out : EMPTY;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) lines = sanitize(JSON.parse(raw));
  } catch {
    /* corrupted / blocked storage → start empty */
  }
}

function commit(next: CartLine[]) {
  lines = next.length ? next : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage full / blocked → keep in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    lines = EMPTY;
    load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return lines;
};
const getServerSnapshot = () => EMPTY;

/* ── actions ─────────────────────────────────────────────── */

/** Returns false (and does nothing) when the input is not a valid, purchasable variant. */
export function addToCart(input: AddToCartInput, qty = 1): boolean {
  load();
  if (!input.variantId || !input.handle || !input.name || !Number.isFinite(input.price) || input.price < 0) return false;
  const max = input.max ? Math.min(HARD_MAX, Math.max(1, Math.floor(input.max))) : DEFAULT_MAX;
  qty = clampQty(qty, max);
  const i = lines.findIndex((l) => l.variantId === input.variantId);
  if (i === -1) {
    commit([
      ...lines,
      {
        variantId: input.variantId,
        handle: input.handle,
        size: input.size,
        qty,
        max,
        name: input.name,
        price: input.price,
        image: input.image,
        imageAlt: input.imageAlt ?? input.name,
      },
    ]);
  } else {
    // keep the latest price / photo, add the units
    commit(
      lines.map((l, j) =>
        j === i
          ? { ...l, price: input.price, name: input.name, image: input.image ?? l.image, max, qty: Math.min(max, l.qty + qty) }
          : l,
      ),
    );
  }
  return true;
}

export function setLineQty(handle: string, size: string, qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) return removeFromCart(handle, size);
  commit(lines.map((l) => (l.handle === handle && l.size === size ? { ...l, qty: Math.min(l.max, Math.floor(qty)) } : l)));
}

export function removeFromCart(handle: string, size: string) {
  commit(lines.filter((l) => !(l.handle === handle && l.size === size)));
}

export function clearCart() {
  commit(EMPTY);
}

/* ── hook ────────────────────────────────────────────────── */

export function useCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    const items: CartItem[] = current.map((line) => ({
      ...line,
      product: { name: line.name, images: line.image ? [line.image] : [], imageLabel: line.imageAlt },
      total: line.price * line.qty,
    }));
    return {
      items,
      /** total units in the cart */
      count: items.reduce((n, i) => n + i.qty, 0),
      /** sum in COP */
      subtotal: items.reduce((n, i) => n + i.total, 0),
      add: addToCart,
      setQty: setLineQty,
      remove: removeFromCart,
      clear: clearCart,
    };
  }, [current]);
}
