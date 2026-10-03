"use client";
import { useSyncExternalStore } from "react";
import { WOMPI_PUBLIC_KEY } from "@/lib/api/config";
import type { ApiPaymentInstructions } from "@/lib/api/types";

const KEY = "dept-last-order";
/** El token de acceso del pedido solo se entrega una vez; se conserva este tiempo para poder reanudar o consultar el pago. */
const TTL_MS = 6 * 60 * 60 * 1000;

export interface LastOrder {
  orderNumber: number;
  accessToken: string;
  reference: string;
  createdAt: number;
  /** carrito del que salió el pedido (ya convertido en la API): permite saber que el carrito local corresponde a este pago */
  cartId: string;
  /** instrucciones de pago originales: con ellas se reanuda el pago con la MISMA referencia */
  payment: ApiPaymentInstructions;
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: LastOrder | null = null;

function parse(raw: string | null): LastOrder | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LastOrder> | null;
    if (!v || typeof v.orderNumber !== "number" || typeof v.accessToken !== "string" || typeof v.createdAt !== "number" || !v.payment || typeof v.payment.reference !== "string") return null;
    if (Date.now() - v.createdAt > TTL_MS) return null;
    return { ...(v as LastOrder), cartId: typeof v.cartId === "string" ? v.cartId : "", reference: v.payment.reference };
  } catch {
    return null;
  }
}

/** Lee el último pedido (localStorage, para que también funcione en otra pestaña). Referencia estable mientras no cambie el valor guardado. */
export function readLastOrder(): LastOrder | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

/** Guarda el último pedido para la página de resultado y para reanudar el pago (con caducidad). */
export function saveLastOrder(o: Omit<LastOrder, "createdAt" | "reference">): void {
  const value: LastOrder = { ...o, reference: o.payment.reference, createdAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: el enlace del correo (/orders/N?token=…) sigue funcionando */
  }
  listeners.forEach((l) => l());
}

export function clearLastOrder(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Último pedido guardado; `null` en el servidor y en el primer pintado (hidratación segura). */
export function useLastOrder(): LastOrder | null {
  return useSyncExternalStore(subscribe, readLastOrder, () => null);
}

/** URL del checkout alojado de Wompi con la firma de integridad que entrega la API. */
export function wompiCheckoutUrl(p: ApiPaymentInstructions): string {
  const url = new URL("https://checkout.wompi.co/p/");
  url.searchParams.set("public-key", p.publicKey ?? WOMPI_PUBLIC_KEY);
  url.searchParams.set("currency", p.currency);
  url.searchParams.set("amount-in-cents", String(p.amountInCents));
  url.searchParams.set("reference", p.reference);
  if (p.signatureIntegrity) url.searchParams.set("signature:integrity", p.signatureIntegrity);
  if (p.redirectUrl) url.searchParams.set("redirect-url", p.redirectUrl);
  return url.toString();
}

/** A dónde mandar al comprador para pagar, según el proveedor de pagos de la API. */
export function paymentDestination(p: ApiPaymentInstructions): string {
  if (p.provider === "wompi") return wompiCheckoutUrl(p);
  return p.checkoutUrl ?? "/checkout/result";
}

/** Navega a la pasarela (URL externa) o a una ruta interna. */
export function goToPayment(dest: string, push: (href: string) => void): void {
  if (/^https?:\/\//.test(dest)) window.location.assign(dest);
  else push(dest);
}

/** Minutos que faltan para que venza la reserva (`reservedUntil` de la API); `null` si no hay dato. */
export function minutesLeft(reservedUntil: string | null | undefined, now = Date.now()): number | null {
  if (!reservedUntil) return null;
  const ms = new Date(reservedUntil).getTime() - now;
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 60_000)) : null;
}

/**
 * IVA y total del resumen con el envío elegido. El carrito se cotiza SIN envío, así que el IVA del envío se calcula igual
 * que la API: tasa estimada a partir de la cotización (IVA ÷ base) y redondeo al entero más cercano sobre (base + envío).
 * Cubre precios con IVA incluido (lo normal en la tienda) y sin IVA.
 */
export function totalsWithShipping(q: { subtotal: number; discountTotal: number; taxTotal: number; total: number } | null, shipping: number): { tax: number; total: number; taxIncluded: boolean } {
  if (!q) return { tax: 0, total: shipping, taxIncluded: true };
  const base = q.subtotal - q.discountTotal;
  const tax = q.taxTotal;
  const taxIncluded = !(tax > 0 && q.total === base + tax);
  if (tax <= 0 || base <= 0) return { tax, total: q.total + shipping, taxIncluded };
  // tasa en centésimas de punto porcentual, ajustada al punto porcentual entero más cercano (19 % → 1900)
  const exact = taxIncluded ? (10_000 * tax) / (base - tax) : (10_000 * tax) / base;
  const rate = Math.round(exact / 100) * 100;
  const withShipping = base + shipping;
  const totalTax = taxIncluded ? Math.round((withShipping * rate) / (10_000 + rate)) : Math.round((withShipping * rate) / 10_000);
  return { tax: totalTax, total: taxIncluded ? withShipping : withShipping + totalTax, taxIncluded };
}

const noopSubscribe = () => () => undefined;
/** `false` en el servidor y en el primer pintado del cliente; `true` ya hidratado (sin leer almacenamiento durante el render). */
export const useHydrated = (): boolean => useSyncExternalStore(noopSubscribe, () => true, () => false);
