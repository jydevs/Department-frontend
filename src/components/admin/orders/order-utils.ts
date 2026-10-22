import type { OrderDetail, OrderLine } from "@/lib/admin/api/orders";

/** Unidades de una línea que aún se pueden enviar (las reembolsadas sin enviar no cuentan). */
export function shippableUnits(line: OrderLine): number {
  return Math.max(0, line.quantity - Math.max(line.fulfilledQuantity, line.refundedQuantity));
}

/** Unidades de una línea que aún se pueden marcar como devueltas. */
export function refundableUnits(line: OrderLine): number {
  return Math.max(0, line.quantity - line.refundedQuantity);
}

export function refundableAmount(order: OrderDetail): number {
  return Math.max(0, order.total - order.totalRefunded);
}

export function hasShippableUnits(order: OrderDetail): boolean {
  return order.lines.some((l) => shippableUnits(l) > 0);
}

export function canCreateFulfillment(order: OrderDetail): boolean {
  return order.status === "open" && hasShippableUnits(order);
}

export function canRefund(order: OrderDetail): boolean {
  return ["open", "completed", "cancelled", "expired"].includes(order.status) && (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded") && refundableAmount(order) > 0;
}

export function hasShipments(order: OrderDetail): boolean {
  return order.lines.some((l) => l.fulfilledQuantity > 0);
}

export function canCancelOrder(order: OrderDetail): boolean {
  return order.status === "pending" || (order.status === "open" && !hasShipments(order));
}

export function canEditContact(order: OrderDetail): boolean {
  return order.fulfillmentStatus === "unfulfilled" && order.status !== "cancelled" && order.status !== "expired";
}

export function isPaid(order: OrderDetail): boolean {
  return order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded";
}

export function lineName(line: Pick<OrderLine, "title" | "variantTitle">): string {
  return line.variantTitle && line.variantTitle !== "Default Title" ? `${line.title} · ${line.variantTitle}` : line.title;
}
