"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getProduct } from "@/data/products";
import type { Product } from "@/data/types";

/**
 * Client-side cart (no backend). A tiny external store persisted in
 * localStorage and read through `useSyncExternalStore`, so it is hydration-safe
 * (server / first paint = empty cart) and shared across every component.
 */

export interface CartLine {
  handle: string;
  size: string;
  qty: number;
}

export interface CartItem extends CartLine {
  product: Product;
  /** unit price × qty, in COP */
  total: number;
}

const KEY = "dept-cart-v1";
const MAX_QTY = 10;
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return EMPTY;
  const out: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { handle, size, qty } = entry as Record<string, unknown>;
    if (typeof handle !== "string" || typeof size !== "string" || typeof qty !== "number") continue;
    if (!getProduct(handle)) continue;
    out.push({ handle, size, qty: Math.min(MAX_QTY, Math.max(1, Math.floor(qty))) });
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

export function addToCart(handle: string, size: string, qty = 1) {
  load();
  const i = lines.findIndex((l) => l.handle === handle && l.size === size);
  if (i === -1) {
    commit([...lines, { handle, size, qty: Math.min(MAX_QTY, qty) }]);
  } else {
    commit(lines.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)));
  }
}

export function setLineQty(handle: string, size: string, qty: number) {
  if (qty <= 0) return removeFromCart(handle, size);
  commit(
    lines.map((l) =>
      l.handle === handle && l.size === size ? { ...l, qty: Math.min(MAX_QTY, qty) } : l,
    ),
  );
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
    const items: CartItem[] = [];
    for (const line of current) {
      const product = getProduct(line.handle);
      if (product) items.push({ ...line, product, total: product.price * line.qty });
    }
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
