/** Tipos de los DTO públicos del backend (`/api/v1/storefront/*`). Fuente de verdad: Department-backend/docs/openapi.json. */

export interface ApiImage { url: string; alt: string | null; width: number | null; height: number | null }

export interface ApiProductSummary { id: string; handle: string; title: string; price: number; image: ApiImage | null; available: boolean }

export interface ApiVariant {
  id: string; title: string; sku: string | null; price: number; compareAtPrice: number | null; available: boolean;
  optionValues: { id: string; name: string; value: string }[];
}

export interface ApiProductDetails {
  id: string; handle: string; title: string; descriptionHtml: string; vendor: string | null; productType: string | null; tags: string[];
  variants: ApiVariant[]; options: { id: string; name: string; values: string[] }[];
  media: (ApiImage & { id: string })[]; metafields: { namespace: string; key: string; value: string }[];
  seo: { title: string | null; description: string | null }; createdAt: string; updatedAt: string;
}

export interface ApiCollectionSummary { id: string; handle: string; title: string; image: ApiImage | null }
export interface ApiCollectionDetails extends ApiCollectionSummary {
  descriptionHtml: string; seo: { title: string | null; description: string | null }; createdAt: string; updatedAt: string;
}

export interface Cursor<T> { items: T[]; nextCursor: string | null; hasMore: boolean }

export interface ApiCollectionPage { collection: ApiCollectionDetails; products: Cursor<ApiProductSummary> }

export interface ApiSearch { products: ApiProductSummary[]; collections: ApiCollectionSummary[] }

/* ── carrito / checkout ── */
export interface ApiCartLine {
  variantId: string; productId: string; productTitle: string; variantTitle: string; sku: string | null; imageUrl: string | null;
  unitPrice: number; compareAtPrice: number | null; quantity: number; lineTotal: number; available: boolean; maxQuantity: number;
}
export interface ApiQuote {
  currency: string; lines: ApiCartLine[]; subtotal: number; discountTotal: number; discount: { code: string; title?: string } | null;
  shippingTotal: number; shippingRate: { id: string; name: string } | null; taxTotal: number; total: number; warnings: string[];
}
export interface ApiCart { id: string; currency: string; discountCode: string | null; itemCount: number; expiresAt: string; quote: ApiQuote }
export interface ApiCartCreated { id: string; token: string; expiresAt: string }
export interface ApiShippingRate { id: string; name: string; price: number; basePrice: number; isFree: boolean; minDays: number | null; maxDays: number | null }

export interface ApiAddress {
  fullName: string; phone: string; department: string; city: string; address1: string; address2?: string; postalCode?: string;
  documentType?: "CC" | "CE" | "NIT" | "PP"; documentNumber?: string;
}
export interface ApiPaymentInstructions {
  provider: "wompi" | "mock"; reference: string; amountInCents: number; currency: string;
  publicKey?: string; signatureIntegrity?: string; redirectUrl?: string; checkoutUrl?: string;
}
export interface ApiCheckoutResponse { orderNumber: number; orderId: string; accessToken: string; total: number; currency: string; payment: ApiPaymentInstructions }
export interface ApiPublicOrder {
  orderNumber: number; status: string; paymentStatus: string; fulfillmentStatus: string; currency: string; subtotal: number; discountTotal: number;
  shippingTotal: number; taxTotal: number; total: number; discountCode: string | null; shippingRateName: string | null; email: string; shippingAddress: ApiAddress;
  lines: { title: string; variantTitle: string; imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number; fulfilledQuantity: number }[];
  fulfillments: { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: string }[];
  payment: { provider: string; status: string; method: string | null } | null; createdAt: string; paidAt: string | null; reservedUntil: string | null;
}

/* ── contenido (CMS) ── */
export interface ApiContentDoc<T = unknown> { kind: "settings" | "menu" | "template" | "page"; key: string; title: string | null; data: T; publishedAt?: string | null }
export interface ApiPageListItem { handle: string; title: string | null; key?: string; seoTitle?: string | null; publishedAt?: string | null }
export interface ApiRedirect { from: string; to: string; status: number }
