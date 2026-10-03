"use client";
import { db, logAudit, nid, now, paginate } from "../mock/db";
import { salesByDay } from "../mock/seed";
import { useAction, useMock, usePaged } from "../query";
import type { Address, FinancialStatus, FulfillmentStatus, Order } from "../types";

export interface OrderFilters { q: string; financial: string; fulfillment: string; tag: string; from: string; to: string; page: number }
const PAGE = 10;

export const useOrders = (f: OrderFilters) =>
  usePaged<Order>(["orders", f], { page: f.page, pageSize: PAGE }, () => {
    const q = f.q.trim().toLowerCase();
    const list = db().orders.filter((o) =>
      (!q || String(o.number).includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.email.toLowerCase().includes(q)) &&
      (!f.financial || o.financial === (f.financial as FinancialStatus)) && (!f.fulfillment || o.fulfillment === (f.fulfillment as FulfillmentStatus)) &&
      (!f.tag || o.tags.includes(f.tag)) && (!f.from || o.createdAt.slice(0, 10) >= f.from) && (!f.to || o.createdAt.slice(0, 10) <= f.to));
    return paginate(list, f.page, PAGE);
  });
export const useOrder = (id: string) => useMock(["order", id], () => db().orders.find((o) => o.id === id) ?? null);
export const useAllOrderTags = () => useMock(["order-tags"], () => [...new Set(db().orders.flatMap((o) => o.tags))]);

const touch = (o: Order, text: string) => o.timeline.unshift({ id: nid("ev"), at: now(), text, actor: "owner@daregulardept.com" });
const find = (id: string): Order => { const o = db().orders.find((x) => x.id === id); if (!o) throw new Error("Pedido no encontrado"); return o; };
const inv = [["orders"], ["order"], ["alerts"], ["analytics"]];
const stockInv = [["products"], ["product"], ["products-all"], ["levels"], ["alerts"]];
/** Devuelve unidades al inventario de la variante con ese SKU. */
const restockSku = (sku: string, qty: number) => { if (qty <= 0) return; for (const p of db().products) for (const v of p.variants) if (v.sku === sku && v.tracked) v.stock += qty; };
const refundedTotal = (o: Order) => o.refunds.reduce((s, r) => s + r.amount, 0);

export const useMarkPaid = () => useAction((id: string) => { const o = find(id); if (o.fulfillment === "cancelled") throw new Error("El pedido está cancelado"); o.financial = "paid"; o.payments.push({ id: nid("pay"), method: "Manual", amount: o.total, at: now(), ref: "MANUAL" }); touch(o, "Marcado como pagado manualmente"); logAudit("order.mark-paid", "order", id, { financial: "pending" }, { financial: "paid" }); }, { invalidate: inv, success: "Pedido marcado como pagado" });
export const useCancelOrder = () => useAction(({ id, restock }: { id: string; restock: boolean }) => {
  const o = find(id);
  if (o.fulfillment === "fulfilled") throw new Error("No se puede cancelar un pedido ya enviado; usa un reembolso.");
  if (o.fulfillment === "cancelled") throw new Error("El pedido ya está cancelado");
  const before = o.fulfillment;
  o.fulfillment = "cancelled"; touch(o, `Pedido cancelado${restock ? " (stock repuesto)" : " (sin reponer stock)"}`);
  // solo se repone lo que no salió en un envío activo ni se repuso ya por reembolsos
  if (restock) for (const l of o.lines) restockSku(l.sku, l.qty - l.fulfilledQty - l.refundedQty);
  logAudit("order.cancel", "order", id, { fulfillment: before }, { fulfillment: "cancelled", restock });
}, { invalidate: [...inv, ...stockInv], success: "Pedido cancelado" });
export const useCreateShipment = () => useAction(({ id, carrier, tracking, qty }: { id: string; carrier: string; tracking: string; qty: Record<string, number> }) => {
  const o = find(id); if (o.fulfillment === "cancelled") throw new Error("El pedido está cancelado");
  const lineIds = Object.entries(qty).filter(([, n]) => n > 0).map(([lineId, n]) => ({ lineId, qty: n }));
  if (!lineIds.length) throw new Error("Selecciona al menos una línea");
  o.shipments.push({ id: nid("shp"), carrier, tracking, lineIds, status: "active", createdAt: now() });
  for (const s of lineIds) { const l = o.lines.find((x) => x.id === s.lineId); if (l) l.fulfilledQty += s.qty; }
  o.fulfillment = o.lines.every((l) => l.fulfilledQty >= l.qty) ? "fulfilled" : "partial"; touch(o, `Envío creado (${carrier} ${tracking})`);
  logAudit("order.fulfill", "order", id, null, { carrier, tracking });
}, { invalidate: inv, success: "Envío creado" });
export const useCancelShipment = () => useAction(({ id, shipmentId }: { id: string; shipmentId: string }) => {
  const o = find(id); if (o.fulfillment === "cancelled") throw new Error("El pedido está cancelado");
  const s = o.shipments.find((x) => x.id === shipmentId); if (!s || s.status === "cancelled") return;
  s.status = "cancelled"; for (const li of s.lineIds) { const l = o.lines.find((x) => x.id === li.lineId); if (l) l.fulfilledQty = Math.max(0, l.fulfilledQty - li.qty); }
  const done = o.lines.reduce((n, l) => n + l.fulfilledQty, 0); o.fulfillment = done === 0 ? "unfulfilled" : o.lines.every((l) => l.fulfilledQty >= l.qty) ? "fulfilled" : "partial"; touch(o, `Envío ${s.tracking} cancelado`);
  logAudit("order.shipment-cancel", "order", id, { tracking: s.tracking }, { status: "cancelled" });
}, { invalidate: inv, success: "Envío cancelado" });
export const useRefund = () => useAction(({ id, amount, reason, restock, qty }: { id: string; amount: number; reason: string; restock: boolean; qty: Record<string, number> }) => {
  const o = find(id); if (amount <= 0) throw new Error("Indica un monto mayor a 0");
  if (o.financial === "pending") throw new Error("El pedido aún no está pagado");
  const paid = o.total - refundedTotal(o); if (amount > paid) throw new Error("El monto supera lo disponible para reembolsar");
  const lineIds = Object.entries(qty).filter(([, n]) => n > 0).map(([lineId, n]) => ({ lineId, qty: n }));
  o.refunds.push({ id: nid("ref"), amount, reason, restock, createdAt: now(), lineIds });
  o.financial = amount >= paid ? "refunded" : "partially-refunded"; touch(o, `Reembolso de $${amount.toLocaleString("es-CO")} (${reason || "sin motivo"})`);
  for (const s of lineIds) {
    const l = o.lines.find((x) => x.id === s.lineId); if (!l) continue;
    l.refundedQty = Math.min(l.qty, l.refundedQty + s.qty); // siempre se registra, con o sin reposición
    if (restock && o.fulfillment !== "cancelled") restockSku(l.sku, s.qty);
  }
  logAudit("order.refund", "order", id, null, { amount, reason, restock });
}, { invalidate: [...inv, ...stockInv], success: "Reembolso registrado" });
export const useAddNote = () => useAction(({ id, text }: { id: string; text: string }) => { find(id).notes.unshift({ id: nid("nt"), text, at: now(), author: "owner@daregulardept.com" }); }, { invalidate: inv, success: "Nota agregada" });
export const useSetTags = () => useAction(({ id, tags }: { id: string; tags: string[] }) => { find(id).tags = tags; }, { invalidate: [...inv, ["order-tags"]], success: "Etiquetas actualizadas" });
export const useEditContact = () => useAction(({ id, email, phone, address }: { id: string; email: string; phone: string; address: Address }) => {
  const o = find(id); if (o.fulfillment !== "unfulfilled") throw new Error("Solo se puede editar mientras el pedido está sin enviar");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Correo inválido");
  o.customer.email = email; o.customer.phone = phone; o.shippingAddress = address; touch(o, "Contacto y dirección editados");
}, { invalidate: inv, success: "Datos actualizados" });

/* Analítica */
export const useAnalytics = (days: number) => useMock(["analytics", days], () => {
  const series = salesByDay().slice(-days);
  const sum = (k: "value" | "prev") => series.reduce((s, d) => s + d[k], 0);
  const orders = db().orders;
  const top = new Map<string, { title: string; qty: number; revenue: number }>();
  for (const o of orders) for (const l of o.lines) { const t = top.get(l.title) ?? { title: l.title, qty: 0, revenue: 0 }; t.qty += l.qty; t.revenue += l.qty * l.price; top.set(l.title, t); }
  const sales = sum("value"), prev = sum("prev"), count = Math.round(sales / 215000), prevCount = Math.round(prev / 215000);
  return { series, sales, prevSales: prev, orders: count, prevOrders: prevCount, aov: Math.round(sales / Math.max(1, count)), customers: db().customers.length, top: [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5) };
});
export const useAlerts = () => useMock(["alerts"], () => ({
  refundPending: db().orders.filter((o) => o.financial === "refund-pending"),
  lowStock: db().products.flatMap((p) => p.variants.filter((v) => v.tracked && v.stock <= 3).map((v) => ({ product: p.title, variant: v.title, stock: v.stock, id: p.id }))),
  unfulfilled: db().orders.filter((o) => o.fulfillment === "unfulfilled" && o.financial === "paid").length,
}));
