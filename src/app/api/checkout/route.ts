import type { NextRequest } from "next/server";
import { issueFrom } from "@/lib/cart/messages";
import {
  badRequest,
  callApi,
  clearCartCookie,
  fail,
  guardMutation,
  isCartGone,
  isUuid,
  json,
  readCartCookie,
  readJson,
} from "@/lib/cart/server";
import type { CheckoutResult, PaymentInstructions } from "@/lib/cart/types";
import { saveOrderCookie } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

const ADDRESS_FIELDS = ["fullName", "phone", "department", "city", "address1", "address2", "postalCode", "documentType", "documentNumber"] as const;

/** Keeps only the known address fields and drops the empty ones (the API rejects "" in optional constrained fields). */
function cleanAddress(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const key of ADDRESS_FIELDS) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim() !== "") out[key] = v.trim();
  }
  return out;
}

interface ApiCheckout {
  orderNumber: number;
  orderId: string;
  accessToken: string;
  total: number;
  currency: string;
  payment: PaymentInstructions & { checkoutUrl?: string };
}

/**
 * Creates the order from the visitor's cart. The browser sends the form + an `Idempotency-Key` (kept by the client
 * while the body does not change, so a retry never creates a second order); the cart id and token come from the
 * httpOnly cookie. The order's access token never reaches the browser: it goes into an httpOnly cookie.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req);
  if (blocked) return blocked;
  const body = await readJson(req);
  if (body instanceof Response) return body;

  const key = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!/^[\x21-\x7e]{8,120}$/.test(key)) return badRequest("Falta la clave de la solicitud. Recarga la página.");
  if (!isUuid(body.shippingRateId)) return badRequest("Elige un método de envío.", { shippingRateId: "Elige un método de envío." });
  const shippingAddress = cleanAddress(body.shippingAddress);
  if (!shippingAddress) return badRequest("Completa la dirección de envío.");

  const cart = await readCartCookie();
  if (!cart) return fail(issueFrom("CART_EMPTY", 400));

  const payload: Record<string, unknown> = {
    cartId: cart.id,
    email: typeof body.email === "string" ? body.email.trim() : "",
    shippingAddress,
    shippingRateId: body.shippingRateId,
  };
  if (typeof body.phone === "string" && body.phone.trim()) payload.phone = body.phone.trim();
  const billing = body.billingAddress ? cleanAddress(body.billingAddress) : null;
  if (billing) payload.billingAddress = billing;
  if (typeof body.customerNote === "string" && body.customerNote.trim()) payload.customerNote = body.customerNote.trim();

  const result = await callApi<ApiCheckout>(req, "POST", "/storefront/checkouts", {
    cartToken: cart.token,
    idempotencyKey: key,
    body: payload,
  });
  if (!result.ok) {
    if (isCartGone(result.issue) || result.issue.code === "CART_ALREADY_CONVERTED") await clearCartCookie();
    return fail(result.issue);
  }

  const { orderNumber, accessToken, total, currency, payment } = result.data;
  const instructions: PaymentInstructions = {
    provider: payment.provider,
    reference: payment.reference,
    amountInCents: payment.amountInCents,
    currency: payment.currency,
    publicKey: payment.publicKey,
    signatureIntegrity: payment.signatureIntegrity,
    redirectUrl: payment.redirectUrl,
    expirationTime: payment.expirationTime,
  };
  await saveOrderCookie(orderNumber, accessToken);
  // the API marked the cart as converted: from now on the order is what matters
  await clearCartCookie();

  const out: CheckoutResult = { orderNumber, total, currency, payment: instructions };
  return json(out, 201);
}
