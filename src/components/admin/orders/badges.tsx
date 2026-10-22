import { Badge, StatusBadge, type BadgeTone } from "@/components/admin/ui";
import { REFUND_PENDING_TAG } from "@/lib/admin/api/orders";

const ORDER_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pendiente de pago", tone: "warning" },
  open: { label: "Abierto", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
  expired: { label: "Caducado", tone: "neutral" },
};

const PAYMENT_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pago pendiente", tone: "warning" },
  paid: { label: "Pagado", tone: "success" },
  failed: { label: "Pago fallido", tone: "danger" },
  partially_refunded: { label: "Reembolso parcial", tone: "warning" },
  refunded: { label: "Reembolsado", tone: "neutral" },
};

const FULFILLMENT_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  unfulfilled: { label: "Sin enviar", tone: "warning" },
  partial: { label: "Envío parcial", tone: "info" },
  fulfilled: { label: "Enviado", tone: "success" },
};

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_LABELS).map(([value, v]) => ({ value, label: v.label }));
export const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_LABELS).map(([value, v]) => ({ value, label: v.label }));
export const FULFILLMENT_STATUS_OPTIONS = Object.entries(FULFILLMENT_LABELS).map(([value, v]) => ({ value, label: v.label }));

export function orderStatusLabel(status: string): string {
  return ORDER_LABELS[status]?.label ?? status;
}

export function OrderStatusBadge({ status }: { status: string }) {
  const m = ORDER_LABELS[status];
  return <StatusBadge status={status} label={m?.label} tone={m?.tone} />;
}

export function PaymentBadge({ status }: { status: string }) {
  const m = PAYMENT_LABELS[status];
  return <StatusBadge status={status} label={m?.label} tone={m?.tone} />;
}

/** El estado de envío no aplica a pedidos sin pagar, cancelados o caducados: se atenúa. */
export function FulfillmentBadge({ status, orderStatus }: { status: string; orderStatus?: string }) {
  const m = FULFILLMENT_LABELS[status];
  const inactive = orderStatus === "cancelled" || orderStatus === "expired" || orderStatus === "pending";
  if (inactive && status === "unfulfilled") return <StatusBadge status={status} label="Sin enviar" tone="neutral" />;
  return <StatusBadge status={status} label={m?.label} tone={m?.tone} />;
}

/** Etiquetas del pedido; `refund-pending` se destaca. */
export function OrderTag({ tag }: { tag: string }) {
  if (tag === REFUND_PENDING_TAG) {
    return (
      <Badge tone="warning" dot>
        Reembolso pendiente
      </Badge>
    );
  }
  return <Badge tone="neutral">{tag}</Badge>;
}
