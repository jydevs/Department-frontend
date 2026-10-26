import { Badge } from "@/components/admin/ui/Display";
import type { OrderStatus } from "@/lib/admin/types";

const S: Record<OrderStatus, [string, "ok" | "warn" | "info" | "neutral" | "danger"]> = {
  pending: ["Por pagar", "warn"], open: ["Abierto", "info"], completed: ["Completado", "ok"], cancelled: ["Cancelado", "neutral"], expired: ["Expirado", "neutral"],
};
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const [label, tone] = S[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
