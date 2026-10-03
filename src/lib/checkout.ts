"use client";
import { WOMPI_PUBLIC_KEY } from "@/lib/api/config";
import type { ApiPaymentInstructions } from "@/lib/api/types";

const KEY = "dept-last-order";

export interface LastOrder { orderNumber: number; accessToken: string; reference: string; createdAt: number }

/** El token del pedido solo se entrega una vez: se guarda en sessionStorage para la página de resultado. */
export function saveLastOrder(o: Omit<LastOrder, "createdAt">): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...o, createdAt: Date.now() }));
  } catch {
    /* sin almacenamiento: el enlace del correo (/orders/N?token=…) sigue funcionando */
  }
}
export function readLastOrder(): LastOrder | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null") as LastOrder | null;
    return v && typeof v.orderNumber === "number" && typeof v.accessToken === "string" ? v : null;
  } catch {
    return null;
  }
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

/** A dónde mandar al comprador tras crear el pedido, según el proveedor de pagos de la API. */
export function paymentDestination(p: ApiPaymentInstructions): string {
  if (p.provider === "wompi") return wompiCheckoutUrl(p);
  return p.checkoutUrl ?? "/checkout/result";
}
