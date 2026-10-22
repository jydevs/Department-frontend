import type { OrderView } from "@/lib/cart/types";

export type OrderPhase = "paid" | "pending" | "declined" | "cancelled" | "expired";

/**
 * Reads the API's order into what the buyer needs to know. The API keeps an order `pending` after a DECLINED / ERROR
 * transaction (the buyer may retry with the same reference), so "declined" is `pending` + a failed payment.
 */
export function orderPhase(order: Pick<OrderView, "status" | "paymentStatus" | "payment">): OrderPhase {
  if (["paid", "partially_refunded", "refunded"].includes(order.paymentStatus)) return "paid";
  if (order.status === "expired") return "expired";
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "pending") {
    const p = order.payment?.status;
    if (p === "declined" || p === "error" || order.paymentStatus === "failed") return "declined";
    return "pending";
  }
  // open / completed / archived… without a paid flag should not happen; treat as paid so we never ask to pay again
  return "paid";
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
