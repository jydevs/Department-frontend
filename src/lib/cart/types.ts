/**
 * Shapes the cart BFF (`/api/cart/**`) returns to the browser. They mirror the API's `Quote` but carry only what the
 * UI needs. Every amount is in COP pesos and is computed by the SERVER: the client never derives a price.
 */

export interface CartLineView {
  variantId: string;
  /** handle of the line's product (null when the API cannot resolve it) */
  productHandle: string | null;
  productTitle: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: boolean;
  /** units of this variant the shop can still sell (null = no limit known) */
  maxQuantity: number | null;
  /** client only: the server has not confirmed this line yet */
  pending?: boolean;
}

export interface CartDiscountView {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  amount: number;
}

export interface CartWarningView {
  code: "VARIANT_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "DISCOUNT_INVALID";
  message: string;
  variantId?: string;
}

export interface CartTaxBreakdown {
  label: string;
  ratePercent: number;
  /** base without tax */
  netAmount: number;
  taxAmount: number;
}

export interface CartState {
  /** null while the visitor has no cart on the server */
  cartId: string | null;
  itemCount: number;
  discountCode: string | null;
  discount: CartDiscountView | null;
  lines: CartLineView[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  /** true when the tax is already part of the prices (total = subtotal - discount + shipping) */
  taxIncluded: boolean;
  taxBreakdown: CartTaxBreakdown | null;
  /** the shipping rate the quote was computed with (only when the cart was read with one) */
  shippingRate: { id: string; name: string } | null;
  /** the API says this cart already became an order: the BFF drops it and reports an empty cart */
  converted: boolean;
  warnings: CartWarningView[];
}

export const EMPTY_CART_STATE: CartState = {
  cartId: null,
  itemCount: 0,
  discountCode: null,
  discount: null,
  lines: [],
  subtotal: 0,
  discountTotal: 0,
  shippingTotal: 0,
  taxTotal: 0,
  total: 0,
  taxIncluded: true,
  taxBreakdown: null,
  shippingRate: null,
  converted: false,
  warnings: [],
};

/** Error body of every BFF route: `{ error: ApiIssue }`. `message` is already in Spanish. */
export interface ApiIssue {
  code: string;
  message: string;
  status: number;
  /** field → message, for VALIDATION_ERROR */
  fields?: Record<string, string>;
  /** extra data the UI may use (e.g. `available` stock) */
  details?: Record<string, unknown>;
}

export interface ShippingOption {
  id: string;
  name: string;
  /** price to charge for THIS cart (0 when free) */
  price: number;
  basePrice: number;
  isFree: boolean;
  minDays: number | null;
  maxDays: number | null;
}

/** Everything the checkout BFF needs to open the payment page again (not secret: it is in the gateway URL anyway). */
export interface PaymentInstructions {
  provider: "wompi" | "mock";
  reference: string;
  amountInCents: number;
  currency: string;
  publicKey?: string;
  signatureIntegrity?: string;
  redirectUrl?: string;
}

export interface CheckoutResult {
  orderNumber: number;
  total: number;
  currency: string;
  payment: PaymentInstructions;
}

export interface OrderLineView {
  variantId: string | null;
  productId: string | null;
  /** null when the product no longer exists */
  productHandle: string | null;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  fulfilledQuantity: number;
}

export interface OrderView {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  discountCode: string | null;
  shippingRateName: string | null;
  email: string;
  shippingAddress: Record<string, unknown> | null;
  lines: OrderLineView[];
  fulfillments: { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: string }[];
  payment: { provider: string; status: string; method: string | null; instructions: PaymentInstructions | null } | null;
  createdAt: string;
  paidAt: string | null;
  reservedUntil: string | null;
}
