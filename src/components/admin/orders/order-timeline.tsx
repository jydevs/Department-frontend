"use client";

import { useState, type FormEvent } from "react";
import { Bell, Ban, Banknote, CircleDot, CreditCard, FileEdit, PackageCheck, PackageX, ReceiptText, ShoppingBag, StickyNote, Timer, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button, Card, DateTime, ErrorState, Pagination, Skeleton, Textarea, useToast } from "@/components/admin/ui";
import { formatCop } from "@/lib/admin/format";
import { orderErrorMessage, useAddOrderNote, useOrderTimeline, type OrderEvent } from "@/lib/admin/api/orders";
import { useCan } from "@/lib/admin/permissions";

interface Described {
  title: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}

const FIELD_LABELS: Record<string, string> = {
  internalNote: "nota interna",
  tags: "etiquetas",
  email: "correo",
  phone: "teléfono",
  shippingAddress: "dirección de envío",
};

const REASON_LABELS: Record<string, string> = {
  cancelled_after_payment: "pedido cancelado después de pagarse",
  late_payment: "pago recibido tras caducar el pedido",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function describeEvent(e: OrderEvent): Described {
  const d = e.data ?? {};
  switch (e.type) {
    case "order.created":
      return { title: "Pedido creado", icon: ShoppingBag };
    case "order.paid":
      return { title: d.manual ? "Pago registrado manualmente" : "Pago confirmado", detail: str(d.method) ? `Método: ${String(d.method)}` : undefined, icon: CreditCard, tone: "success" };
    case "order.cancelled":
      return {
        title: "Pedido cancelado",
        detail: [str(d.reason) ? `Motivo: ${String(d.reason)}` : null, d.restock ? "Inventario repuesto" : null].filter(Boolean).join(" · ") || undefined,
        icon: Ban,
        tone: "danger",
      };
    case "order.expired":
      return { title: "Pedido caducado por falta de pago", icon: Timer, tone: "danger" };
    case "order.updated": {
      const fields = Array.isArray(d.fields) ? (d.fields as unknown[]).filter((f): f is string => typeof f === "string").map((f) => FIELD_LABELS[f] ?? f) : [];
      return { title: "Pedido editado", detail: fields.length ? `Cambios en: ${fields.join(", ")}` : undefined, icon: FileEdit };
    }
    case "order.refund_pending":
    case "payment.late_approval": {
      const outstanding = num(d.outstanding);
      const reason = str(d.reason);
      return {
        title: e.type === "payment.late_approval" ? "Pago aprobado después de caducar el pedido" : "Reembolso pendiente",
        detail: [reason ? `Origen: ${REASON_LABELS[reason] ?? reason}` : null, outstanding !== null ? `Por devolver: ${formatCop(outstanding)}` : null, "Hay que devolver el dinero manualmente en Wompi y registrar el reembolso."].filter(Boolean).join(" · "),
        icon: TriangleAlert,
        tone: "warning",
      };
    }
    case "order.refund_pending_cleared":
      return { title: "Reembolso pendiente resuelto", detail: "Se reembolsó el total del pedido.", icon: Banknote, tone: "success" };
    case "payment.mismatch":
      return { title: "El monto pagado no coincide con el pedido", icon: TriangleAlert, tone: "warning" };
    case "payment.declined":
      return { title: "Pago rechazado", detail: str(d.status) ?? undefined, icon: CreditCard, tone: "danger" };
    case "payment.status_ignored":
      return { title: "Notificación de pago ignorada", icon: CreditCard };
    case "fulfillment.created": {
      const parts = [str(d.carrier), str(d.trackingNumber) ? `guía ${String(d.trackingNumber)}` : null].filter(Boolean);
      return { title: "Envío creado", detail: [parts.join(" · "), d.notifyCustomer ? "Cliente notificado" : null].filter(Boolean).join(" · ") || undefined, icon: PackageCheck, tone: "success" };
    }
    case "fulfillment.cancelled":
      return { title: "Envío cancelado", icon: PackageX, tone: "warning" };
    case "refund.created": {
      const amount = num(d.amount);
      return {
        title: amount !== null ? `Reembolso registrado por ${formatCop(amount)}` : "Reembolso registrado",
        detail: [str(d.reason) ? `Motivo: ${String(d.reason)}` : null, d.restocked ? "Inventario repuesto" : null].filter(Boolean).join(" · ") || undefined,
        icon: ReceiptText,
      };
    }
    case "note":
      return { title: "Nota", detail: str(d.note) ?? undefined, icon: StickyNote };
    default:
      return { title: e.type, icon: CircleDot };
  }
}

function actorLabel(e: OrderEvent): string {
  switch (e.actorType) {
    case "staff":
      return "Equipo";
    case "customer":
      return "Cliente";
    case "guest":
      return "Comprador";
    case "api_key":
      return "Integración";
    case "system":
      return "Sistema";
    default:
      return e.actorType;
  }
}

const toneClass: Record<NonNullable<Described["tone"]>, string> = {
  default: "bg-surface-3 text-muted",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
};

export function OrderTimeline({ orderId }: { orderId: string }) {
  const canWrite = useCan("orders:write");
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const timeline = useOrderTimeline(orderId, page);
  const addNote = useAddOrderNote(orderId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = note.trim();
    if (!text) {
      setNoteError("Escribe la nota");
      return;
    }
    setNoteError(null);
    addNote.mutate(text, {
      onSuccess: () => {
        setNote("");
        setPage(1);
        toast.success("Nota añadida a la línea de tiempo");
      },
      onError: (err) => setNoteError(orderErrorMessage(err)),
    });
  };

  return (
    <Card title="Línea de tiempo" description="Historial de todo lo ocurrido con el pedido." flush>
      {canWrite ? (
        <form onSubmit={submit} className="border-b border-border p-5" noValidate>
          <Textarea label="Añadir una nota" rows={2} maxLength={2000} placeholder="Visible solo para el equipo…" value={note} onChange={(e) => setNote(e.target.value)} error={noteError} />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" variant="secondary" loading={addNote.isPending}>
              Publicar nota
            </Button>
          </div>
        </form>
      ) : null}
      {timeline.error ? (
        <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} />
      ) : timeline.isLoading ? (
        <div className="space-y-4 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ol className="p-5" aria-label="Eventos del pedido">
          {(timeline.data?.items ?? []).map((ev, i, arr) => {
            const d = describeEvent(ev);
            const Icon = d.icon;
            return (
              <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < arr.length - 1 ? <span aria-hidden className="absolute top-8 bottom-0 left-4 w-px bg-border" /> : null}
                <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${toneClass[d.tone ?? "default"]}`}>
                  <Icon aria-hidden size={15} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium">{d.title}</p>
                  {d.detail ? <p className="mt-0.5 text-[13px] break-words whitespace-pre-wrap text-muted">{d.detail}</p> : null}
                  <p className="mt-1 text-xs text-muted">
                    <DateTime value={ev.createdAt} /> · {actorLabel(ev)}
                  </p>
                </div>
              </li>
            );
          })}
          {(timeline.data?.items.length ?? 0) === 0 ? (
            <li className="flex items-center gap-2 text-sm text-muted">
              <Bell aria-hidden size={15} /> Sin eventos todavía.
            </li>
          ) : null}
        </ol>
      )}
      {timeline.data && timeline.data.totalPages > 1 ? (
        <Pagination className="border-t border-border" page={page} pageSize={timeline.data.pageSize} total={timeline.data.total} onPageChange={setPage} pageSizes={[10]} />
      ) : null}
    </Card>
  );
}
