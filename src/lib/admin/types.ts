export type Id = string;
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; totalPages: number }

export type OrderStatus = "pending" | "open" | "completed" | "cancelled" | "expired";
export type FinancialStatus = "pending" | "paid" | "failed" | "refunded" | "partially-refunded" | "refund-pending";
export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";
export interface Address { name: string; line1: string; line2?: string; city: string; department: string; phone: string; postalCode?: string }
/** Dirección de pedido: la del backend, con documento de identidad opcional. */
export interface OrderAddress extends Address { documentType?: "CC" | "CE" | "NIT" | "PP"; documentNumber?: string }
export interface OrderLine { id: Id; variantId: Id; productId: Id; title: string; variant: string; sku: string; qty: number; price: number; fulfilledQty: number; refundedQty: number; image: string | null }
export interface Shipment { id: Id; carrier: string; tracking: string; trackingUrl: string | null; lineIds: { lineId: Id; qty: number }[]; status: "active" | "cancelled"; createdAt: string }
export interface Refund { id: Id; amount: number; reason: string; restock: boolean; providerStatus: string; createdAt: string; lineIds: { lineId: Id; qty: number }[] }
export interface OrderEvent { id: Id; at: string; type: string; text: string; actor: string }
export interface Order {
  id: Id; number: number; version: number; createdAt: string; updatedAt: string; status: OrderStatus;
  customer: { name: string; email: string; phone: string };
  financial: FinancialStatus; fulfillment: FulfillmentStatus;
  lines: OrderLine[]; shippingAddress: OrderAddress; billingAddress: OrderAddress | null;
  subtotal: number; shipping: number; tax: number; discount: number; total: number; totalRefunded: number;
  paymentMethod: string; payments: { id: Id; method: string; amount: number; at: string; ref: string; status: string }[];
  shipments: Shipment[]; refunds: Refund[]; timeline: OrderEvent[]; notes: { id: Id; text: string; at: string; author: string }[];
  tags: string[]; discountCode?: string; shippingRateName?: string; customerNote?: string;
  paidAt: string | null; cancelledAt: string | null; cancelReason: string | null; reservedUntil: string | null;
}
/** Fila de la lista de pedidos. */
export interface OrderSummary {
  id: Id; number: number; createdAt: string; status: OrderStatus; customer: { name: string; email: string };
  financial: FinancialStatus; fulfillment: FulfillmentStatus; total: number; itemCount: number; tags: string[];
}

export type ProductStatus = "active" | "draft" | "archived";
export interface Variant { id: Id; title: string; options: string[]; price: number; compareAt?: number; sku: string; weight?: number; barcode?: string; tracked: boolean; backorder: boolean; stock: number }
export interface MediaItem { id: Id; url: string; alt: string; name: string; size: number; type: string; createdAt: string; usages: { kind: string; label: string }[] }
export interface Product {
  id: Id; handle: string; title: string; description: string; status: ProductStatus; vendor: string; type: string; tags: string[];
  seoTitle: string; seoDescription: string;
  options: { name: string; values: string[] }[]; variants: Variant[]; images: { id: Id; url: string; alt: string }[];
  metafields: { key: string; value: string }[]; updatedAt: string;
}
export interface Rule { field: "tag" | "type" | "vendor" | "price" | "title"; op: "equals" | "contains" | "gt" | "lt"; value: string }
export interface Collection {
  id: Id; handle: string; title: string; description: string; kind: "manual" | "smart"; published: boolean;
  productIds: Id[]; rules: Rule[]; match: "all" | "any"; sort: "manual" | "best-selling" | "newest" | "price-asc" | "price-desc" | "title";
  image: string; seoTitle: string; seoDescription: string; metafields: { key: string; value: string }[];
}
export interface Location { id: Id; name: string; city: string; active: boolean }
export interface StockAdjustment { id: Id; variantId: Id; productTitle: string; variantTitle: string; delta: number; reason: string; at: string; actor: string }

export interface Customer {
  id: Id; name: string; firstName: string; lastName: string; email: string; phone: string; tags: string[]; note: string;
  marketing: boolean; isActive: boolean; hasAccount: boolean; emailVerified: boolean; createdAt: string; lastLoginAt: string | null;
  addresses: Address[]; anonymized: boolean;
}
export interface CustomerOrder { id: Id; number: number; status: string; paymentStatus: string; fulfillmentStatus: string; currency: string; total: number; createdAt: string }
export interface Discount {
  id: Id; code: string; title: string; kind: "percent" | "fixed" | "free_shipping"; value: number; active: boolean;
  minSubtotal: number | null; usageLimit: number | null; oncePerEmail: boolean; startsAt: string; endsAt: string | null; used: number;
}
export interface DiscountRedemption { id: Id; orderNumber: number | null; email: string; amount: number; at: string }
export interface ShippingRate { id: Id; name: string; price: number; freeOver: number | null; minDays: number | null; maxDays: number | null; active: boolean; position: number }
export interface ShippingZone { id: Id; name: string; departments: string[]; active: boolean; rates: ShippingRate[] }
export interface TaxSettings { rate: number; included: boolean; label: string }
export interface Subscriber { id: Id; email: string; status: "pending" | "subscribed" | "unsubscribed"; source: string; consentAt: string | null; createdAt: string }
export interface ContactMessage { id: Id; name: string; email: string; subject: string | null; body: string; status: "new" | "read" | "replied" | "spam"; createdAt: string }
export interface EmailTemplate { key: string; name: string; subject: string; html: string; text: string; active: boolean; variables: string[]; updatedAt: string }
export interface Staff { id: Id; name: string; email: string; roleId: Id; active: boolean; twoFactor: boolean; lastLogin: string | null }
export interface Role { id: Id; key: string; name: string; permissions: string[]; isSystem: boolean }
export interface AuditEntry { id: Id; at: string; actorType: string; actorId: string | null; action: string; entity: string; entityId: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; ip: string; requestId: string | null }
export interface ImportJob { id: Id; kind: "products" | "customers"; file: string; dryRun: boolean; status: "queued" | "running" | "done" | "failed" | "cancelled"; total: number; processed: number; errors: { row: number; message: string }[] }
export interface Redirect { id: Id; from: string; to: string; permanent: boolean; hits: number }

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export interface Section { id: Id; type: string; enabled: boolean; settings: Record<string, JsonValue>; blocks?: { id: Id; type: string; settings: Record<string, JsonValue> }[] }
export type DocKind = "settings" | "menu" | "template" | "page";
export interface DocVersion { id: Id; number: number; at: string; actor: string; content: JsonValue; label: string }
export interface ContentDoc {
  kind: DocKind; key: string; title: string; draft: JsonValue; published: JsonValue | null; version: number;
  dirty: boolean; scheduledAt: string | null; publishedAt: string | null; versions: DocVersion[];
  seoTitle?: string; seoDescription?: string;
}
export interface MenuItem { id: Id; label: string; link: { type: "collection" | "product" | "page" | "url"; handle?: string; url?: string }; children?: MenuItem[] }

export interface SchemaField {
  key: string; label: string; type: "string" | "text" | "markdown" | "number" | "boolean" | "enum" | "image" | "color" | "url" | "collection" | "product" | "links";
  options?: string[]; max?: number; min?: number; maxValue?: number; required?: boolean; hint?: string;
}
export interface SectionType { type: string; label: string; settings: SchemaField[]; blockTypes: { type: string; label: string; fields: SchemaField[] }[]; maxBlocks?: number }
