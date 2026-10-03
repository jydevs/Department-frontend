export type Id = string;
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; totalPages: number }

export type FinancialStatus = "pending" | "paid" | "refunded" | "partially-refunded" | "refund-pending";
export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled" | "cancelled";
export interface Address { name: string; line1: string; line2?: string; city: string; department: string; phone: string; postalCode?: string }
export interface OrderLine { id: Id; title: string; variant: string; sku: string; qty: number; price: number; fulfilledQty: number; refundedQty: number; image: string }
export interface Shipment { id: Id; carrier: string; tracking: string; lineIds: { lineId: Id; qty: number }[]; status: "active" | "cancelled"; createdAt: string }
export interface Refund { id: Id; amount: number; reason: string; restock: boolean; createdAt: string; lineIds: { lineId: Id; qty: number }[] }
export interface OrderEvent { id: Id; at: string; text: string; actor: string }
export interface Order {
  id: Id; number: number; createdAt: string;
  customer: { id: Id; name: string; email: string; phone: string };
  financial: FinancialStatus; fulfillment: FulfillmentStatus;
  lines: OrderLine[]; shippingAddress: Address; billingAddress: Address;
  subtotal: number; shipping: number; tax: number; discount: number; total: number;
  paymentMethod: string; payments: { id: Id; method: string; amount: number; at: string; ref: string }[];
  shipments: Shipment[]; refunds: Refund[]; timeline: OrderEvent[]; notes: { id: Id; text: string; at: string; author: string }[];
  tags: string[]; discountCode?: string;
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
  id: Id; name: string; email: string; phone: string; tags: string[]; note: string; marketing: boolean;
  ordersCount: number; totalSpent: number; createdAt: string; addresses: Address[]; anonymized: boolean;
}
export interface Discount {
  id: Id; code: string; kind: "percentage" | "fixed" | "free-shipping"; value: number; active: boolean;
  minSubtotal: number; usageLimit: number | null; perCustomer: boolean; startsAt: string; endsAt: string | null; used: number;
  redemptions: { orderNumber: number; customer: string; amount: number; at: string }[];
}
export interface ShippingRate { id: Id; name: string; price: number; freeOver: number | null; eta: string }
export interface ShippingZone { id: Id; name: string; departments: string[]; rates: ShippingRate[] }
export interface Subscriber { id: Id; email: string; status: "subscribed" | "unsubscribed"; source: string; createdAt: string }
export interface ContactMessage { id: Id; name: string; email: string; subject: string; body: string; status: "new" | "read" | "replied" | "archived"; createdAt: string }
export interface EmailTemplate { id: Id; key: string; name: string; subject: string; html: string; text: string; variables: string[] }
export interface Staff { id: Id; name: string; email: string; role: string; active: boolean; twoFactor: boolean; lastLogin: string | null }
export interface Role { key: string; name: string; description: string; permissions: string[] }
export interface AuditEntry { id: Id; at: string; actor: string; action: string; entity: string; entityId: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; ip: string }
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
