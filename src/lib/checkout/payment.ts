import type { PaymentInstructions } from "@/lib/cart/types";

/**
 * Where to send the buyer to pay, from the instructions the BACKEND returns (it signs the integrity hash and chooses
 * the redirect URL; the front only forwards them).
 *
 * - wompi → Wompi's hosted Web Checkout with the documented parameters.
 * - mock  → our own simulator page (development only).
 */

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

export function wompiCheckoutUrl(p: PaymentInstructions): string | null {
  if (p.provider !== "wompi" || !p.publicKey || !p.signatureIntegrity || !p.redirectUrl) return null;
  const enc = encodeURIComponent;
  // "signature:integrity" keeps its literal colon, as in Wompi's documentation
  return (
    `${WOMPI_CHECKOUT_URL}?public-key=${enc(p.publicKey)}` +
    `&currency=${enc(p.currency)}` +
    `&amount-in-cents=${enc(String(p.amountInCents))}` +
    `&reference=${enc(p.reference)}` +
    `&signature:integrity=${enc(p.signatureIntegrity)}` +
    `&redirect-url=${enc(p.redirectUrl)}`
  );
}

export function mockCheckoutPath(p: PaymentInstructions, orderNumber: number): string {
  return `/mock-checkout/${encodeURIComponent(p.reference)}?order=${orderNumber}`;
}

/** Destination (absolute for the gateway, a path for the mock) or null when the instructions are incomplete. */
export function paymentDestination(p: PaymentInstructions, orderNumber: number): { external: boolean; url: string } | null {
  if (p.provider === "wompi") {
    const url = wompiCheckoutUrl(p);
    return url ? { external: true, url } : null;
  }
  if (p.provider === "mock") return { external: false, url: mockCheckoutPath(p, orderNumber) };
  return null;
}
