"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api-client";
import { ApiError, errorMessage } from "../errors";
import { LOW_STOCK_THRESHOLD } from "../format";
import { checkText, optionalPhone, requiredPhone } from "../validate";
import { useToast } from "@/components/admin/ui/Toast";
import { useCan } from "../permissions";
import { useAction, useApi } from "../query";
import type { FinancialStatus, FulfillmentStatus, Order, OrderAddress, OrderEvent, OrderStatus, OrderSummary, Page } from "../types";

/* ---------- Tipos del DTO (backend: commerce/orders/dto/orders-admin.dto.ts) ---------- */
interface ApiAddress { fullName: string; phone: string; department: string; city: string; address1: string; address2?: string; postalCode?: string; documentType?: "CC" | "CE" | "NIT" | "PP"; documentNumber?: string }
interface ApiSummary { id: string; orderNumber: number; createdAt: string; email: string; customerName: string | null; total: number; status: string; paymentStatus: string; fulfillmentStatus: string; itemCount: number; tags: string[] }
interface ApiEvent { id: string; type: string; data: Record<string, unknown>; actorType: string; actorId: string | null; createdAt: string }
interface ApiDetail {
  id: string; orderNumber: number; version: number; createdAt: string; updatedAt: string; email: string; phone: string | null; status: string; paymentStatus: string; fulfillmentStatus: string;
  subtotal: number; discountTotal: number; shippingTotal: number; taxTotal: number; total: number; totalRefunded: number; discountCode: string | null; shippingRateName: string | null;
  shippingAddress: ApiAddress; billingAddress: ApiAddress | null; customerNote: string | null; tags: string[]; reservedUntil: string | null; paidAt: string | null; cancelledAt: string | null; cancelReason: string | null;
  paymentProvider: string; paymentReference: string;
  lines: { id: string; variantId: string; productId: string; sku: string | null; title: string; variantTitle: string; imageUrl: string | null; unitPrice: number; quantity: number; fulfilledQuantity: number; refundedQuantity: number }[];
  payments: { id: string; provider: string; reference: string; amount: number; status: string; method: string | null; createdAt: string }[];
  fulfillments: { id: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; createdAt: string; lines: { orderLineId: string; quantity: number }[] }[];
  refunds: { id: string; amount: number; reason: string | null; restocked: boolean; providerStatus: string; createdAt: string; lines: { orderLineId: string; quantity: number }[] }[];
  events: ApiEvent[];
}

export const REFUND_PENDING_TAG = "refund-pending";

/* ---------- Adaptadores ---------- */
const PAYMENT: Record<string, FinancialStatus> = { pending: "pending", paid: "paid", failed: "failed", partially_refunded: "partially-refunded", refunded: "refunded" };
const toFinancial = (paymentStatus: string, tags: string[]): FinancialStatus =>
  tags.includes(REFUND_PENDING_TAG) && paymentStatus !== "refunded" ? "refund-pending" : (PAYMENT[paymentStatus] ?? "pending");
const toAddress = (a: ApiAddress): OrderAddress => ({ name: a.fullName, line1: a.address1, line2: a.address2 || undefined, city: a.city, department: a.department, phone: a.phone, postalCode: a.postalCode || undefined, documentType: a.documentType, documentNumber: a.documentNumber });
export const addressToApi = (a: OrderAddress): ApiAddress => ({
  fullName: a.name.trim(), phone: a.phone.trim(), department: a.department.trim(), city: a.city.trim(), address1: a.line1.trim(), address2: a.line2?.trim() || undefined, postalCode: a.postalCode?.trim() || undefined,
  documentType: a.documentType, documentNumber: a.documentNumber?.trim() || undefined,
});
const cop = (n: unknown) => `$${Number(n ?? 0).toLocaleString("es-CO")}`;
const FIELD: Record<string, string> = { internalNote: "nota interna", tags: "etiquetas", email: "correo", phone: "teléfono", shippingAddress: "dirección de envío" };
const ACTOR: Record<string, string> = { staff: "Equipo", guest: "Cliente", customer: "Cliente", system: "Sistema", api_key: "Integración", webhook: "Pasarela de pago" };

export function eventText(type: string, d: Record<string, unknown>): string {
  const s = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : "");
  switch (type) {
    case "order.created": return `Pedido creado por ${cop(d.total)}${s("discountCode") ? ` con código ${s("discountCode")}` : ""}`;
    case "order.paid": return d.manual ? `Marcado como pagado manualmente${s("providerTransactionId") ? ` (ref. ${s("providerTransactionId")})` : ""}` : `Pago confirmado${s("method") ? ` (${s("method")})` : ""}`;
    case "order.cancelled": return `Pedido cancelado: ${s("reason") || "sin motivo"}${d.restock ? " · stock repuesto" : ""}`;
    case "order.expired": return "Pedido expirado por falta de pago";
    case "order.updated": return `Pedido editado (${(Array.isArray(d.fields) ? (d.fields as string[]) : []).map((f) => FIELD[f] ?? f).join(", ") || "datos"})`;
    case "order.refund_pending": return `Reembolso pendiente: ${s("reason") === "cancelled_after_payment" ? "pedido cancelado después de pagar" : s("reason") || "requiere devolver el dinero"}${d.outstanding ? ` · ${cop(d.outstanding)}` : ""}`;
    case "payment.late_approval": return "Pago aprobado después de expirar o cancelar el pedido: requiere reembolso";
    case "order.refund_pending_cleared": return "Reembolso pendiente resuelto";
    case "payment.mismatch": return "El pago recibido no coincide con el total del pedido";
    case "payment.declined": return "Pago rechazado";
    case "payment.status_ignored": return "Notificación de pago ignorada";
    case "note": return s("note");
    case "fulfillment.created": return `Envío creado${s("carrier") || s("trackingNumber") ? ` (${[s("carrier"), s("trackingNumber")].filter(Boolean).join(" ")})` : ""}`;
    case "fulfillment.cancelled": return "Envío cancelado";
    case "refund.created": return `Reembolso de ${cop(d.amount)} (${s("reason") || "sin motivo"})${d.restocked ? " · stock repuesto" : ""}`;
    default: return type;
  }
}
const toEvent = (e: ApiEvent): OrderEvent => ({ id: e.id, type: e.type, at: e.createdAt, text: eventText(e.type, e.data), actor: ACTOR[e.actorType] ?? e.actorType });

const fromSummary = (o: ApiSummary): OrderSummary => ({
  id: o.id, number: o.orderNumber, createdAt: o.createdAt, status: o.status as OrderStatus, customer: { name: o.customerName ?? "—", email: o.email },
  financial: toFinancial(o.paymentStatus, o.tags), fulfillment: o.fulfillmentStatus as FulfillmentStatus, total: o.total, itemCount: o.itemCount, tags: o.tags,
});

const fromDetail = (o: ApiDetail): Order => ({
  id: o.id, number: o.orderNumber, version: o.version, createdAt: o.createdAt, updatedAt: o.updatedAt, status: o.status as OrderStatus,
  customer: { name: o.shippingAddress.fullName, email: o.email, phone: o.phone ?? o.shippingAddress.phone },
  financial: toFinancial(o.paymentStatus, o.tags), fulfillment: o.fulfillmentStatus as FulfillmentStatus,
  lines: o.lines.map((l) => ({ id: l.id, variantId: l.variantId, productId: l.productId, title: l.title, variant: l.variantTitle, sku: l.sku ?? "—", qty: l.quantity, price: l.unitPrice, fulfilledQty: l.fulfilledQuantity, refundedQty: l.refundedQuantity, image: l.imageUrl })),
  shippingAddress: toAddress(o.shippingAddress), billingAddress: o.billingAddress ? toAddress(o.billingAddress) : null,
  subtotal: o.subtotal, shipping: o.shippingTotal, tax: o.taxTotal, discount: o.discountTotal, total: o.total, totalRefunded: o.totalRefunded,
  paymentMethod: o.payments[0]?.method ?? o.paymentProvider,
  payments: o.payments.map((p) => ({ id: p.id, method: p.method ?? p.provider, amount: p.amount, at: p.createdAt, ref: p.reference, status: p.status })),
  shipments: o.fulfillments.map((f) => ({ id: f.id, carrier: f.carrier ?? "", tracking: f.trackingNumber ?? "", trackingUrl: f.trackingUrl, lineIds: f.lines.map((l) => ({ lineId: l.orderLineId, qty: l.quantity })), status: f.status === "cancelled" ? "cancelled" : "active", createdAt: f.createdAt })),
  refunds: o.refunds.map((r) => ({ id: r.id, amount: r.amount, reason: r.reason ?? "", restock: r.restocked, providerStatus: r.providerStatus, createdAt: r.createdAt, lineIds: r.lines.map((l) => ({ lineId: l.orderLineId, qty: l.quantity })) })),
  timeline: o.events.map(toEvent),
  notes: o.events.filter((e) => e.type === "note").map((e) => ({ id: e.id, text: String(e.data.note ?? ""), at: e.createdAt, author: ACTOR[e.actorType] ?? e.actorType })),
  tags: o.tags, discountCode: o.discountCode ?? undefined, shippingRateName: o.shippingRateName ?? undefined, customerNote: o.customerNote ?? undefined,
  paidAt: o.paidAt, cancelledAt: o.cancelledAt, cancelReason: o.cancelReason, reservedUntil: o.reservedUntil,
});

/* ---------- Reglas de negocio del backend, para habilitar/ocultar acciones ---------- */
export const shippableQty = (l: Order["lines"][number]) => l.qty - Math.max(l.fulfilledQty, l.refundedQty);
export const refundableAmount = (o: Order) => o.total - o.totalRefunded;
export const canMarkPaid = (o: Order) => o.status === "pending";
export const canShip = (o: Order) => o.status === "open" && o.lines.some((l) => shippableQty(l) > 0);
export const canCancel = (o: Order) => o.status === "pending" || (o.status === "open" && o.lines.every((l) => l.fulfilledQty === 0));
export const canRefund = (o: Order) => (o.financial !== "pending" && o.financial !== "failed") && ["open", "completed", "cancelled", "expired"].includes(o.status) && refundableAmount(o) > 0;
export const canEditContact = (o: Order) => o.fulfillment === "unfulfilled" && o.status !== "cancelled" && o.status !== "expired";
export const canCancelShipment = (o: Order) => o.status === "open" || o.status === "completed";

/* ---------- Lista y detalle ---------- */
export interface OrderFilters { q: string; status: string; financial: string; fulfillment: string; tag: string; from: string; to: string; page: number }
export const emptyOrderFilters: OrderFilters = { q: "", status: "", financial: "", fulfillment: "", tag: "", from: "", to: "", page: 1 };
const PAGE = 20;
const API_PAYMENT: Record<string, string> = { pending: "pending", paid: "paid", failed: "failed", "partially-refunded": "partially_refunded", refunded: "refunded" };

export const useOrders = (f: OrderFilters, pageSize = PAGE, enabled = true) =>
  useApi<Page<ApiSummary>, Page<OrderSummary>>(["orders"], "/admin/orders", {
    enabled,
    query: {
      page: f.page, pageSize, q: f.q.trim(), status: f.status, fulfillmentStatus: f.fulfillment,
      paymentStatus: f.financial === "refund-pending" ? "" : API_PAYMENT[f.financial],
      tag: f.financial === "refund-pending" ? REFUND_PENDING_TAG : f.tag.trim().toLowerCase(),
      // fechas de calendario en hora de Bogotá (UTC-5)
      from: f.from ? `${f.from}T00:00:00-05:00` : "", to: f.to ? `${f.to}T23:59:59.999-05:00` : "",
    },
    select: (p) => ({ ...p, items: p.items.map(fromSummary) }),
  });
export const useOrder = (id: string) => useApi<ApiDetail, Order>(["order", id], `/admin/orders/${encodeURIComponent(id)}`, { select: fromDetail, staleTime: 0 });

/* ---------- Acciones ---------- */
const inv = [["orders"], ["order"], ["alerts"], ["analytics"]];
const stockInv = [["products"], ["product"], ["levels"], ["inventory"]];

/** Ante un 409 (estado cambiado por otra persona o regla de negocio) recarga el pedido y explica qué pasó. */
function useGuard() {
  const qc = useQueryClient();
  return async <T,>(fn: () => Promise<T>): Promise<T> => {
    try { return await fn(); } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409 || e.status === 412) {
          void qc.invalidateQueries({ queryKey: ["order"] }); void qc.invalidateQueries({ queryKey: ["orders"] });
          if (e.code === "CONCURRENT_UPDATE") throw new Error("Otra persona modificó el pedido. Se recargaron los datos; revisa y vuelve a intentarlo.");
          throw new Error(`${errorMessage(e)} Se recargó el pedido.`);
        }
      }
      throw e;
    }
  };
}
const base = (id: string) => `/admin/orders/${encodeURIComponent(id)}`;

export const useMarkPaid = () => { const g = useGuard(); return useAction(({ id, reference, note }: { id: string; reference?: string; note?: string }) => g(() => api.post(`${base(id)}/mark-paid`, { reference: reference?.trim() || undefined, note: note?.trim() || undefined })), { invalidate: inv, success: "Pedido marcado como pagado" }); };
export const useCancelOrder = () => { const g = useGuard(); return useAction(({ id, reason, restock }: { id: string; reason: string; restock: boolean }) => g(() => api.post(`${base(id)}/cancel`, { reason: reason.trim(), restock })), { invalidate: [...inv, ...stockInv], success: "Pedido cancelado" }); };
export interface ShipmentInput { id: string; carrier: string; tracking: string; trackingUrl: string; notify: boolean; qty: Record<string, number> }
export const useCreateShipment = () => {
  const g = useGuard();
  return useAction(({ id, carrier, tracking, trackingUrl, notify, qty }: ShipmentInput) => {
    const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([orderLineId, quantity]) => ({ orderLineId, quantity }));
    if (!lines.length) throw new Error("Selecciona al menos una unidad para enviar");
    return g(() => api.post(`${base(id)}/fulfillments`, { lines, carrier: carrier.trim() || undefined, trackingNumber: tracking.trim() || undefined, trackingUrl: trackingUrl.trim() || undefined, notifyCustomer: notify }));
  }, { invalidate: inv, success: "Envío creado" });
};
export const useCancelShipment = () => { const g = useGuard(); return useAction(({ id, shipmentId }: { id: string; shipmentId: string }) => g(() => api.post(`${base(id)}/fulfillments/${encodeURIComponent(shipmentId)}/cancel`)), { invalidate: inv, success: "Envío cancelado" }); };
export const useRefund = () => {
  const g = useGuard();
  return useAction(({ id, amount, reason, restock, qty }: { id: string; amount: number; reason: string; restock: boolean; qty: Record<string, number> }) => {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("Indica un monto entero mayor a 0");
    const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([orderLineId, quantity]) => ({ orderLineId, quantity }));
    if (restock && !lines.length) throw new Error("Para reponer stock indica las unidades devueltas");
    return g(() => api.post(`${base(id)}/refunds`, { amount, reason: reason.trim() || undefined, lines: lines.length ? lines : undefined, restock }));
  }, { invalidate: [...inv, ...stockInv], success: "Reembolso registrado" });
};
export const useAddNote = () => { const g = useGuard(); return useAction(({ id, text }: { id: string; text: string }) => g(() => api.post(`${base(id)}/notes`, { note: text })), { invalidate: inv, success: "Nota agregada" }); };
/**
 * Etiquetas del pedido con guardado SERIALIZADO. Cada PATCH necesita la `version` vigente y devuelve la nueva: si se lanzaran
 * 3 cambios seguidos en paralelo, el 2.º y el 3.º usarían una versión vieja (falso conflicto o etiquetas perdidas).
 * Aquí los cambios se aplican de inmediato en pantalla y se envían de uno en uno, siempre el último estado deseado.
 * Las etiquetas del sistema (reembolso pendiente) no son editables: se conservan.
 */
export function useOrderTags(order: Order) {
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const latest = useRef(order);
  useEffect(() => { latest.current = order; });
  const want = useRef<string[] | null>(null);
  const running = useRef(false);
  const version = useRef<number | null>(null);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setSaving(true);
    try {
      do {
        try {
          while (want.current) {
            const tags = want.current;
            want.current = null;
            const o = latest.current;
            const body = (v: number) => ({ version: v, tags: [...tags.filter((t) => t !== REFUND_PENDING_TAG), ...(o.tags.includes(REFUND_PENDING_TAG) ? [REFUND_PENDING_TAG] : [])] });
            try {
              const r = await api.patch<{ version: number }>(base(o.id), body(version.current ?? o.version));
              version.current = r.version;
            } catch (e) {
              if (!(e instanceof ApiError && (e.status === 409 || e.status === 412))) throw e;
              // la versión cambió por otra acción (otra persona, otra pestaña): se lee la vigente y se reintenta una vez
              const fresh = await api.get<{ version: number }>(base(o.id));
              const r = await api.patch<{ version: number }>(base(o.id), body(fresh.version));
              version.current = r.version;
            }
          }
          toast.success("Etiquetas actualizadas");
        } catch (e) {
          want.current = null;
          toast.error(errorMessage(e));
        }
        version.current = null;
        // espera a que el pedido se recargue para no mostrar un instante las etiquetas anteriores
        await Promise.all([qc.invalidateQueries({ queryKey: ["order"] }), qc.invalidateQueries({ queryKey: ["orders"] })]).catch(() => undefined);
      } while (want.current);
    } finally {
      running.current = false;
      setSaving(false);
      setPending(null);
    }
  }, [qc, toast]);

  const visible = order.tags.filter((t) => t !== REFUND_PENDING_TAG);
  const setTags = useCallback((tags: string[]) => { want.current = tags; setPending(tags); void drain(); }, [drain]);
  return { tags: pending ?? visible, setTags, saving };
}
export const useEditContact = () => {
  const g = useGuard();
  return useAction(({ order, email, phone, address }: { order: Order; email: string; phone: string; address: OrderAddress }) => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Correo inválido");
    const orderPhone = optionalPhone(phone, "El teléfono del pedido");
    const a: OrderAddress = {
      ...address, name: checkText(address.name, "El nombre", 2, 120), phone: requiredPhone(address.phone, "El teléfono de entrega"),
      line1: checkText(address.line1, "La dirección", 5, 200), line2: checkText(address.line2 ?? "", "El complemento", 0, 200), city: checkText(address.city, "La ciudad", 2, 80),
      department: checkText(address.department, "El departamento", 2, 60), postalCode: checkText(address.postalCode ?? "", "El código postal", 0, 12),
    };
    return g(() => api.patch(base(order.id), { version: order.version, email: email.trim(), phone: orderPhone, shippingAddress: addressToApi(a) }));
  }, { invalidate: inv, success: "Datos actualizados" });
};

/* ---------- Analítica (backend: analytics/*, permiso analytics:read) ---------- */
interface ApiOverviewMetrics { grossSales: number; totalRefunded: number; netSales: number; paidOrders: number; averageOrderValue: number; newCustomers: number; createdOrders: number; paidRate: number }
interface ApiOverview { current: ApiOverviewMetrics; previous: ApiOverviewMetrics; change: { netSales: number | null; paidOrders: number | null; averageOrderValue: number | null; newCustomers: number | null; paidRate: number | null } }
interface ApiSales { buckets: { bucket: string; orders: number; grossSales: number; totalRefunded: number; netSales: number }[] }
interface ApiTop { items: { productId: string; title: string; units: number; revenue: number; orders: number }[] }
interface ApiCustomers { totalCustomers: number; newCustomers: number; marketingSubscribers: number; buyers: number; repeatBuyers: number; guestOrders: number }

const DAY = 86_400_000;
/** Fecha de calendario (YYYY-MM-DD) en Bogotá. */
const bogota = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shift = (ymd: string, days: number) => bogota(new Date(Date.parse(`${ymd}T12:00:00-05:00`) + days * DAY));
/** Rango [from, to] inclusivo en días calendario; el periodo anterior tiene la misma duración. */
export const rangeFor = (days: number, today = bogota(new Date())) => {
  const from = shift(today, -(days - 1));
  return { from, to: today, prevFrom: shift(from, -days), prevTo: shift(from, -1) };
};

export interface Analytics {
  series: { day: string; value: number; prev: number }[];
  netSales: number; grossSales: number; totalRefunded: number; paidOrders: number; aov: number; newCustomers: number; totalCustomers: number;
  change: ApiOverview["change"]; paidRate: number; createdOrders: number;
  top: { id: string; title: string; units: number; revenue: number }[];
}
export function useAnalytics(days: number, enabled = true) {
  // el rango se fija por montaje+periodo: una pestaña abierta pasada la medianoche se actualiza al refrescar
  const r = rangeFor(days);
  const q = { from: r.from, to: r.to };
  const overview = useApi<ApiOverview>(["analytics", "overview"], "/admin/analytics/overview", { query: q, enabled });
  const sales = useApi<ApiSales>(["analytics", "sales"], "/admin/analytics/sales", { query: { ...q, groupBy: "day" }, enabled });
  const prevSales = useApi<ApiSales>(["analytics", "sales-prev"], "/admin/analytics/sales", { query: { from: r.prevFrom, to: r.prevTo, groupBy: "day" }, enabled });
  const top = useApi<ApiTop>(["analytics", "top"], "/admin/analytics/top-products", { query: { ...q, limit: 5, sortBy: "revenue" }, enabled });
  const customers = useApi<ApiCustomers>(["analytics", "customers"], "/admin/analytics/customers", { query: q, enabled });
  const all = [overview, sales, prevSales, top, customers];
  const error = all.find((x) => x.error)?.error ?? null;
  const ready = overview.data && sales.data && prevSales.data && top.data && customers.data;
  const data: Analytics | undefined = ready ? {
    series: sales.data!.buckets.map((b, i) => ({ day: b.bucket, value: b.netSales, prev: prevSales.data!.buckets[i]?.netSales ?? 0 })),
    netSales: overview.data!.current.netSales, grossSales: overview.data!.current.grossSales, totalRefunded: overview.data!.current.totalRefunded,
    paidOrders: overview.data!.current.paidOrders, aov: overview.data!.current.averageOrderValue, newCustomers: overview.data!.current.newCustomers, totalCustomers: customers.data!.totalCustomers,
    change: overview.data!.change, paidRate: overview.data!.current.paidRate, createdOrders: overview.data!.current.createdOrders,
    top: top.data!.items.map((t) => ({ id: t.productId, title: t.title, units: t.units, revenue: t.revenue })),
  } : undefined;
  return { data, error, isLoading: enabled && !data && !error, refetch: () => Promise.all(all.map((x) => x.refetch())) };
}

interface ApiLevel { id: string; variantId: string; variantTitle: string; variantSku: string | null; locationName: string; onHand: number; reserved: number }
export function useAlerts() {
  const canOrders = useCan("orders:read"), canStock = useCan("inventory:read");
  const refund = useApi<Page<ApiSummary>>(["alerts", "refund"], "/admin/orders", { query: { tag: REFUND_PENDING_TAG, pageSize: 5 }, enabled: canOrders });
  const unfulfilled = useApi<Page<ApiSummary>>(["alerts", "unfulfilled"], "/admin/orders", { query: { status: "open", fulfillmentStatus: "unfulfilled", pageSize: 1 }, enabled: canOrders });
  const stock = useApi<Page<ApiLevel>>(["alerts", "stock"], "/admin/inventory", { query: { lowStock: true, lowStockThreshold: LOW_STOCK_THRESHOLD, pageSize: 5 }, enabled: canStock });
  const pending = (canOrders && (refund.isLoading || unfulfilled.isLoading)) || (canStock && stock.isLoading);
  const error = refund.error ?? unfulfilled.error ?? stock.error ?? null;
  const data = pending ? undefined : {
    refundPending: (refund.data?.items ?? []).map(fromSummary),
    lowStock: (stock.data?.items ?? []).map((l) => ({ id: l.id, name: l.variantTitle, sku: l.variantSku, stock: Math.max(0, l.onHand - l.reserved), location: l.locationName })),
    lowStockTotal: stock.data?.total ?? 0,
    unfulfilled: unfulfilled.data?.total ?? 0,
  };
  return { data, error, isLoading: pending };
}
