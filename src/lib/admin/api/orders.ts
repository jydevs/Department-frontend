"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { usePaged, type Paged, type PagedParams } from "@/lib/admin/query";
import { formatCop } from "@/lib/admin/format";

/* ------------------------------------------------------------------ */
/* Tipos (reflejan commerce/orders/dto/orders-admin.dto.ts)            */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = ["pending", "open", "completed", "cancelled", "expired"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "partially_refunded", "refunded"] as const;
export const FULFILLMENT_STATUSES = ["unfulfilled", "partial", "fulfilled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/** Etiqueta que el servidor pone cuando hay dinero por devolver a mano. */
export const REFUND_PENDING_TAG = "refund-pending";

export interface OrderSummary {
  id: string;
  orderNumber: number;
  createdAt: string;
  email: string;
  customerName: string | null;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  tags: string[];
}

export interface Address {
  fullName: string;
  phone: string;
  department: string;
  city: string;
  address1: string;
  address2?: string;
  postalCode?: string;
  documentType?: "CC" | "CE" | "NIT" | "PP";
  documentNumber?: string;
}

export interface OrderLine {
  id: string;
  variantId: string;
  productId: string;
  sku: string | null;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
}

export interface OrderPayment {
  id: string;
  provider: string;
  providerTransactionId: string | null;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  rawStatus: string | null;
  method: string | null;
  createdAt: string;
}

export interface FulfillmentLine {
  id: string;
  orderLineId: string;
  quantity: number;
}

export interface Fulfillment {
  id: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string;
  createdAt: string;
  lines: FulfillmentLine[];
}

export interface RefundLine {
  id: string;
  orderLineId: string;
  quantity: number;
}

export interface Refund {
  id: string;
  amount: number;
  reason: string | null;
  restocked: boolean;
  providerStatus: string;
  actorId: string | null;
  createdAt: string;
  lines: RefundLine[];
}

export interface OrderEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  actorType: string;
  actorId: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  totalRefunded: number;
  discountCode: string | null;
  shippingRateName: string | null;
  shippingAddress: Address;
  billingAddress: Address | null;
  customerNote: string | null;
  internalNote: string | null;
  tags: string[];
  reservedUntil: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  paymentProvider: string;
  paymentReference: string;
  lines: OrderLine[];
  payments: OrderPayment[];
  fulfillments: Fulfillment[];
  refunds: Refund[];
  events: OrderEvent[];
}

export interface OrderListParams extends PagedParams {
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  q?: string;
  from?: string;
  to?: string;
  tag?: string;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export const orderKeys = {
  all: ["orders"] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

export function useOrders(params: OrderListParams, options: { enabled?: boolean } = {}) {
  return usePaged<OrderSummary>(orderKeys.all, "/admin/orders", params, options);
}

export function useOrder(id: string): UseQueryResult<OrderDetail, ApiError> {
  return useQuery<OrderDetail, ApiError>({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => api.get<OrderDetail>(`/admin/orders/${id}`, { signal }),
  });
}

export function useOrderTimeline(id: string, page: number, pageSize = 10) {
  return usePaged<OrderEvent>(["orders", "timeline", id], `/admin/orders/${id}/timeline`, { page, pageSize });
}

export type { Paged };

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export interface OrderUpdateInput {
  version: number;
  internalNote?: string | null;
  tags?: string[];
  email?: string;
  phone?: string | null;
  shippingAddress?: Address;
}

export interface CancelInput {
  reason: string;
  restock: boolean;
}

export interface MarkPaidInput {
  reference?: string;
  note?: string;
}

export interface FulfillmentInput {
  lines: Array<{ orderLineId: string; quantity: number }>;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notifyCustomer: boolean;
}

export interface RefundInput {
  amount: number;
  reason?: string;
  lines?: Array<{ orderLineId: string; quantity: number }>;
  restock: boolean;
}

function useOrderMutation<TVars, TResult>(id: string, fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, TVars>({
    mutationFn: fn,
    onSettled: async () => {
      // el servidor sube `version` en casi todo: refrescamos detalle, listas, línea de tiempo y panel de inicio
      await Promise.all([
        qc.invalidateQueries({ queryKey: orderKeys.detail(id) }),
        qc.invalidateQueries({ queryKey: orderKeys.all }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["inventory"] }),
      ]);
    },
  });
}

export function useUpdateOrder(id: string) {
  return useOrderMutation(id, (input: OrderUpdateInput) => api.patch<OrderDetail>(`/admin/orders/${id}`, input));
}

export function useAddOrderNote(id: string) {
  return useOrderMutation(id, (note: string) => api.post<OrderEvent>(`/admin/orders/${id}/notes`, { note }));
}

export function useCancelOrder(id: string) {
  return useOrderMutation(id, (input: CancelInput) => api.post<OrderDetail>(`/admin/orders/${id}/cancel`, input));
}

export function useMarkPaid(id: string) {
  return useOrderMutation(id, (input: MarkPaidInput) => api.post<OrderDetail>(`/admin/orders/${id}/mark-paid`, input));
}

export function useCreateFulfillment(id: string) {
  return useOrderMutation(id, (input: FulfillmentInput) =>
    api.post<{ fulfillment: Fulfillment; order: { status: string; fulfillmentStatus: string } }>(`/admin/orders/${id}/fulfillments`, input),
  );
}

export function useCancelFulfillment(id: string) {
  return useOrderMutation(id, (fid: string) =>
    api.post<{ fulfillment: Fulfillment; order: { status: string; fulfillmentStatus: string } }>(`/admin/orders/${id}/fulfillments/${fid}/cancel`),
  );
}

export function useCreateRefund(id: string) {
  return useOrderMutation(id, (input: RefundInput) =>
    api.post<{ refund: Refund; order: { paymentStatus: string; totalRefunded: number } }>(`/admin/orders/${id}/refunds`, input),
  );
}

/* ------------------------------------------------------------------ */
/* Errores de pedidos traducidos                                       */
/* ------------------------------------------------------------------ */

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_OPEN: "Solo se pueden enviar pedidos abiertos (pagados y no cancelados).",
  ORDER_NOT_PENDING: "Solo los pedidos pendientes de pago se pueden marcar como pagados.",
  ORDER_NOT_EDITABLE: "El contacto y la dirección solo se pueden editar mientras el pedido no tenga envíos y no esté cancelado o caducado.",
  ORDER_NOT_FULFILLABLE: "Los envíos solo se pueden cancelar en pedidos abiertos o completados.",
  ORDER_NOT_REFUNDABLE: "Solo se pueden reembolsar pedidos abiertos, completados, cancelados o caducados.",
  ORDER_NOT_PAID: "Solo se pueden reembolsar pedidos que tengan un pago registrado.",
  ORDER_HAS_FULFILLMENTS: "El pedido ya tiene envíos y no se puede cancelar. Cancela primero los envíos o emite un reembolso.",
  INVALID_ORDER_STATE: "El estado actual del pedido no permite esta acción. Recarga la página para ver el estado más reciente.",
  FULFILLMENT_ALREADY_CANCELLED: "Este envío ya estaba cancelado.",
  FULFILLMENT_INCONSISTENT: "Las cantidades enviadas no coinciden con este envío. Recarga el pedido e inténtalo de nuevo.",
  RESTOCK_NOT_APPLICABLE: "Este pedido nunca comprometió stock (venció o se canceló sin pagarse): no hay nada que reponer. Desmarca «reponer» y vuelve a intentarlo.",
  RESTOCK_REQUIRES_LINES: "Para reponer inventario indica las líneas (y cantidades) que se devuelven.",
  PAYMENT_REFERENCE_DUPLICATE: "Esa referencia de pago ya se usó en otro pedido: usa una distinta.",
  CONFLICT: "Ya existe un registro con esos valores. Revisa los datos e inténtalo de nuevo.",
  IDEMPOTENCY_IN_PROGRESS: "La operación ya se está procesando. Espera un momento.",
};

/**
 * Mensaje en español para un error de la API de pedidos (con detalles de cantidades cuando existen).
 * `forbidden` sustituye al genérico del 403 cuando la acción tiene su propio permiso (pagos, reembolsos).
 */
export function orderErrorMessage(e: unknown, forbidden?: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403 && forbidden) return forbidden;
    const details = (e.details ?? {}) as { refundable?: number; requested?: number; lines?: Array<{ reason: string; pending?: number; refundable?: number }> };
    if (e.code === "REFUND_EXCEEDS_PAID") {
      return typeof details.refundable === "number"
        ? `El monto supera lo que aún se puede reembolsar (máximo ${formatCop(details.refundable)}).`
        : "El monto supera lo que aún se puede reembolsar.";
    }
    if (e.code === "FULFILLMENT_QUANTITY_INVALID") {
      const bad = details.lines?.find((l) => typeof l.pending === "number");
      return bad ? `Alguna cantidad supera las unidades pendientes de enviar (quedan ${bad.pending}). Recarga el pedido e inténtalo de nuevo.` : "Alguna cantidad supera las unidades pendientes de enviar o la línea no pertenece al pedido.";
    }
    if (e.code === "REFUND_QUANTITY_INVALID") {
      const restocked = details.lines?.find((l) => l.reason === "ALREADY_RESTOCKED");
      if (restocked) {
        return typeof restocked.refundable === "number"
          ? `Alguna cantidad ya se repuso al inventario antes (solo quedan ${restocked.refundable} unidades por reponer). Desmarca «reponer» o reduce las unidades.`
          : "Alguna cantidad ya se repuso al inventario antes. Desmarca «reponer» o reduce las unidades.";
      }
      const bad = details.lines?.find((l) => typeof l.refundable === "number");
      return bad ? `Alguna cantidad supera las unidades que aún se pueden reembolsar (quedan ${bad.refundable}).` : "Alguna cantidad supera las unidades reembolsables.";
    }
    if (e.code === "CONCURRENT_UPDATE") return "Alguien más modificó este pedido mientras trabajabas. Se recargó con los datos más recientes: revisa y repite el cambio.";
    const mapped = ORDER_ERROR_MESSAGES[e.code];
    if (mapped) return mapped;
    if (e.code === "NOT_FOUND") return "No se encontró el pedido, envío o línea indicados.";
  }
  return errorMessage(e);
}
