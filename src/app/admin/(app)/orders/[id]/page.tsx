"use client";
import { Ban, CheckCircle2, CreditCard, Pencil, Truck, Undo2 } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Order } from "@/lib/admin/types";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatus";
import { CancelDialog, ContactDialog, MarkPaidDialog, NoteForm, RefundDialog, ShipmentDialog } from "@/components/admin/orders/OrderDialogs";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { TagInput } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { errorMessage, ApiError } from "@/lib/admin/errors";
import { safeHref } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { REFUND_PENDING_TAG, canCancel, canCancelShipment, canEditContact, canMarkPaid, canRefund, canShip, useAddNote, useCancelShipment, useOrder, useOrderTags } from "@/lib/admin/api/orders";

/** Etiquetas editables: los cambios seguidos se guardan en orden (ver `useOrderTags`). */
function OrderTags({ order }: { order: Order }) {
  const { tags, setTags, saving } = useOrderTags(order);
  return <div aria-busy={saving || undefined}><TagInput value={tags} onChange={setTags} /></div>;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: o, isLoading, error, refetch } = useOrder(id);
  const can = useCan("orders:write");
  const [dlg, setDlg] = useState<"paid" | "ship" | "refund" | "cancel" | "contact" | null>(null);
  const confirm = useConfirm();
  const cancelShip = useCancelShipment(), addNote = useAddNote();
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;
  if (error && !o) return error instanceof ApiError && error.status === 404 ? <EmptyState title="Pedido no encontrado" /> : <EmptyState title="No se pudo cargar el pedido" text={errorMessage(error)} action={<Button onClick={() => void refetch()}>Reintentar</Button>} />;
  if (!o) return <EmptyState title="Pedido no encontrado" />;
  const editable = canEditContact(o);
  const refunded = o.totalRefunded;
  const visibleTags = o.tags.filter((t) => t !== REFUND_PENDING_TAG);
  return (
    <>
      <PageHeader title={`Pedido #${o.number}`} breadcrumbs={[{ label: "Pedidos", href: "/admin/orders" }, { label: `#${o.number}` }]}
        description={new Date(o.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
        actions={can ? <>
          {canMarkPaid(o) && <Button icon={<CheckCircle2 className="size-4" />} onClick={() => setDlg("paid")}>Marcar pagado</Button>}
          {canShip(o) && <Button variant="primary" icon={<Truck className="size-4" />} onClick={() => setDlg("ship")}>Crear envío</Button>}
          {canRefund(o) && <Button icon={<Undo2 className="size-4" />} onClick={() => setDlg("refund")}>Reembolsar</Button>}
          {canCancel(o) && <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setDlg("cancel")}>Cancelar</Button>}
        </> : undefined} />
      <div className="mb-4 flex flex-wrap gap-2"><OrderStatusBadge status={o.status} /><StatusBadge status={o.financial} /><StatusBadge status={o.fulfillment} />{o.discountCode && <Badge tone="accent">Código {o.discountCode}</Badge>}</div>
      {o.cancelReason && <p className="mb-4 text-sm text-muted">Motivo de cancelación: {o.cancelReason}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Productos" pad={false}>
            <ul>{o.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 border-b border-line p-4 last:border-0">
                {l.image ? <Image src={l.image} alt="" width={48} height={60} unoptimized className="h-14 w-11 rounded-sm object-cover" /> : <div aria-hidden className="h-14 w-11 rounded-sm bg-surface2" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.title}</p><p className="text-xs text-muted">{l.variant} · SKU {l.sku}</p><p className="text-xs text-muted">Enviadas {l.fulfilledQty}/{l.qty}{l.refundedQty ? ` · reembolsadas ${l.refundedQty}` : ""}</p></div>
                <p className="text-sm text-muted"><Money value={l.price} /> × {l.qty}</p><Money value={l.price * l.qty} className="text-right font-medium sm:w-24" />
              </li>))}</ul>
            <dl className="space-y-1.5 border-t border-line p-4 text-sm">
              {([["Subtotal", o.subtotal], ["Envío", o.shipping], ["Impuestos", o.tax], ["Descuento", -o.discount]] as [string, number][]).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd><Money value={v} /></dd></div>)}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd><Money value={o.total} /></dd></div>
              {refunded > 0 && <div className="flex justify-between text-muted"><dt>Reembolsado</dt><dd>-<Money value={refunded} /></dd></div>}
            </dl>
          </Card>
          <Card title="Envíos">
            {o.shipments.length === 0 ? <p className="text-sm text-muted">Aún no hay envíos.</p> : (
              <ul className="space-y-3">{o.shipments.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line p-3 text-sm">
                  <div><p className="font-medium">{[s.carrier, s.tracking].filter(Boolean).join(" · ") || "Envío sin guía"}{safeHref(s.trackingUrl) && <> · <a href={safeHref(s.trackingUrl)!} target="_blank" rel="noopener noreferrer" className="text-accent-text underline">Rastrear</a></>}</p><p className="text-xs text-muted"><DateTime value={s.createdAt} /> · {s.lineIds.reduce((n, l) => n + l.qty, 0)} unidades</p></div>
                  <div className="flex items-center gap-2">{s.status === "cancelled" ? <Badge>Cancelado</Badge> : <Badge tone="ok">Activo</Badge>}
                    {can && canCancelShipment(o) && s.status === "active" && <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: "Cancelar envío", message: `Se cancelará el envío${s.tracking ? ` con guía ${s.tracking}` : ""} y las unidades volverán a quedar pendientes.`, danger: true, confirmLabel: "Cancelar envío" })) cancelShip.mutate({ id: o.id, shipmentId: s.id }); }}>Cancelar envío</Button>}</div>
                </li>))}</ul>)}
          </Card>
          <Card title="Pagos y reembolsos">
            {o.payments.length + o.refunds.length === 0 && <p className="text-sm text-muted">Sin pagos registrados.</p>}
            <ul className="space-y-2 text-sm">
              {o.payments.map((p) => <li key={p.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-all"><CreditCard className="size-4 shrink-0 text-muted" aria-hidden />{p.method} · {p.ref} · {p.status} · <DateTime value={p.at} /></span><Money value={p.amount} /></li>)}
              {o.refunds.map((r) => <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-accent-text"><span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><Undo2 className="size-4 shrink-0" aria-hidden />Reembolso · {r.reason || "sin motivo"}{r.restock ? " · stock repuesto" : ""}{r.providerStatus === "manual" ? " · devolución manual" : ""}</span><span>-<Money value={r.amount} /></span></li>)}
            </ul>
          </Card>
          <Card title="Línea de tiempo">
            <ol className="space-y-3 border-l border-line pl-4">{o.timeline.map((e) => <li key={e.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" /><p>{e.text}</p><p className="text-xs text-muted">{e.actor} · <DateTime value={e.at} /></p></li>)}</ol>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Cliente" actions={can && editable ? <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setDlg("contact")}>Editar</Button> : undefined}>
            <p className="font-medium">{o.customer.name}</p><p className="text-sm text-muted">{o.customer.email}</p><p className="text-sm text-muted">{o.customer.phone}</p>
            {!editable && <p className="mt-2 text-xs text-muted">La edición solo está disponible mientras el pedido está sin enviar.</p>}
          </Card>
          <Card title={o.shippingRateName ? `Dirección de envío · ${o.shippingRateName}` : "Dirección de envío"}><address className="text-sm not-italic leading-relaxed">{o.shippingAddress.name}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}<br />{o.shippingAddress.city}, {o.shippingAddress.department}{o.shippingAddress.postalCode ? ` · ${o.shippingAddress.postalCode}` : ""}<br />{o.shippingAddress.phone}{o.shippingAddress.documentNumber && <><br />{o.shippingAddress.documentType} {o.shippingAddress.documentNumber}</>}</address></Card>
          {o.customerNote && <Card title="Nota del cliente"><p className="whitespace-pre-wrap text-sm">{o.customerNote}</p></Card>}
          <Card title="Etiquetas">{can ? <OrderTags order={o} /> : <div className="flex flex-wrap gap-1">{visibleTags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}</Card>
          <Card title="Notas internas">
            {can && <NoteForm busy={addNote.isPending} onAdd={(text) => addNote.mutateAsync({ id: o.id, text }).then(() => true, () => false)} />}
            <ul className="mt-3 space-y-2">{o.notes.map((n) => <li key={n.id} className="rounded-sm bg-surface2 p-2.5 text-sm"><p>{n.text}</p><p className="mt-1 text-xs text-muted">{n.author} · <DateTime value={n.at} /></p></li>)}</ul>
          </Card>
        </div>
      </div>
      {dlg === "paid" && <MarkPaidDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "ship" && <ShipmentDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "refund" && <RefundDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "cancel" && <CancelDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "contact" && <ContactDialog order={o} open onClose={() => setDlg(null)} />}
    </>
  );
}
