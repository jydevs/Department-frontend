/** Shapes of the customer API responses the account area uses (mirror of Department-backend customers.dto.ts). */

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export type DocumentType = "CC" | "CE" | "NIT" | "PP";

export interface CustomerAddress {
  id: string;
  label: string | null;
  isDefault: boolean;
  fullName: string;
  phone: string;
  department: string;
  city: string;
  address1: string;
  address2: string | null;
  postalCode: string | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
}

export interface OrderSummary {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export interface OrderLine {
  title: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
}

export interface OrderFulfillment {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string;
}

export interface OrderDetail extends OrderSummary {
  email: string;
  phone: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  totalRefunded: number;
  discountCode: string | null;
  shippingRateName: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown> | null;
  customerNote: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  lines: OrderLine[];
  fulfillments: OrderFulfillment[];
}

export interface OrderPage {
  items: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** What the BFF answers on failure (the API's error body trimmed to what the UI needs). */
export interface BffError {
  code: string;
  message: string;
  /** field → messages, from the API's validation errors */
  fields?: Record<string, string[]>;
  /** seconds, on 429 */
  retryAfter?: number;
}
