"use client";
import { Ban, CheckCircle2, CreditCard, Pencil, Truck, Undo2 } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CancelDialog, ContactDialog, NoteForm, RefundDialog, ShipmentDialog } from "@/components/admin/orders/OrderDialogs";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { TagInput } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useCan } from "@/lib/admin/permissions";
import { useAddNote, useCancelShipment, useMarkPaid, useOrder, useSetTags } from "@/lib/admin/api/orders";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: o, isLoading } = useOrder(id);
  const can = useCan("orders:write");
  const [dlg, setDlg] = useState<"ship" | "refund" | "cancel" | "contact" | null>(null);
  const confirm = useConfirm();
  const markPaid = useMarkPaid(), cancelShip = useCancelShipment(), addNote = useAddNote(), setTags = useSetTags();
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;
  if (!o) return <EmptyState title="Pedido no encontrado" />;
  const editable = o.fulfillment === "unfulfilled";
  const open = o.fulfillment !== "cancelled";
  const refunded = o.refunds.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title={`Pedido #${o.number}`} breadcrumbs={[{ label: "Pedidos", href: "/admin/orders" }, { label: `#${o.number}` }]}
        description={new Date(o.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
        actions={can && open ? <>
          {o.financial === "pending" && <Button icon={<CheckCircle2 className="size-4" />} loading={markPaid.isPending} onClick={async () => { if (await confirm({ title: "Marcar como pagado", message: "Se registrará un pago manual por el total del pedido." })) markPaid.mutate(o.id); }}>Marcar pagado</Button>}
          {o.lines.some((l) => l.fulfilledQty < l.qty) && <Button variant="primary" icon={<Truck className="size-4" />} onClick={() => setDlg("ship")}>Crear envío</Button>}
          {refunded < o.total && o.financial !== "pending" && <Button icon={<Undo2 className="size-4" />} onClick={() => setDlg("refund")}>Reembolsar</Button>}
          <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setDlg("cancel")}>Cancelar</Button>
        </> : undefined} />
      <div className="mb-4 flex flex-wrap gap-2"><StatusBadge status={o.financial} /><StatusBadge status={o.fulfillment} />{o.discountCode && <Badge tone="accent">Código {o.discountCode}</Badge>}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Productos" pad={false}>
            <ul>{o.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 border-b border-line p-4 last:border-0">
                <Image src={l.image} alt="" width={48} height={60} unoptimized className="h-14 w-11 rounded-sm object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.title}</p><p className="text-xs text-muted">{l.variant} · SKU {l.sku}</p><p className="text-xs text-muted">Enviadas {l.fulfilledQty}/{l.qty}{l.refundedQty ? ` · reembolsadas ${l.refundedQty}` : ""}</p></div>
                <p className="text-sm text-muted"><Money value={l.price} /> × {l.qty}</p><Money value={l.price * l.qty} className="w-24 text-right font-medium" />
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
                  <div><p className="font-medium">{s.carrier} · {s.tracking}</p><p className="text-xs text-muted"><DateTime value={s.createdAt} /> · {s.lineIds.reduce((n, l) => n + l.qty, 0)} unidades</p></div>
                  <div className="flex items-center gap-2">{s.status === "cancelled" ? <Badge>Cancelado</Badge> : <Badge tone="ok">Activo</Badge>}
                    {can && s.status === "active" && <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: "Cancelar envío", message: `Se cancelará la guía ${s.tracking}.`, danger: true, confirmLabel: "Cancelar envío" })) cancelShip.mutate({ id: o.id, shipmentId: s.id }); }}>Cancelar envío</Button>}</div>
                </li>))}</ul>)}
          </Card>
          <Card title="Pagos y reembolsos">
            {o.payments.length + o.refunds.length === 0 && <p className="text-sm text-muted">Sin pagos registrados.</p>}
            <ul className="space-y-2 text-sm">
              {o.payments.map((p) => <li key={p.id} className="flex justify-between"><span className="flex items-center gap-2"><CreditCard className="size-4 text-muted" />{p.method} · {p.ref} · <DateTime value={p.at} /></span><Money value={p.amount} /></li>)}
              {o.refunds.map((r) => <li key={r.id} className="flex justify-between text-accent-text"><span className="flex items-center gap-2"><Undo2 className="size-4" />Reembolso · {r.reason || "sin motivo"}{r.restock ? " · stock repuesto" : ""}</span><span>-<Money value={r.amount} /></span></li>)}
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
          <Card title="Dirección de envío"><address className="text-sm not-italic leading-relaxed">{o.shippingAddress.name}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}<br />{o.shippingAddress.city}, {o.shippingAddress.department}<br />{o.shippingAddress.phone}</address></Card>
          <Card title="Etiquetas">{can ? <TagInput value={o.tags} onChange={(tags) => setTags.mutate({ id: o.id, tags })} /> : <div className="flex gap-1">{o.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}</Card>
          <Card title="Notas internas">
            {can && <NoteForm busy={addNote.isPending} onAdd={(text) => addNote.mutate({ id: o.id, text })} />}
            <ul className="mt-3 space-y-2">{o.notes.map((n) => <li key={n.id} className="rounded-sm bg-surface2 p-2.5 text-sm"><p>{n.text}</p><p className="mt-1 text-xs text-muted">{n.author} · <DateTime value={n.at} /></p></li>)}</ul>
          </Card>
        </div>
      </div>
      {dlg === "ship" && <ShipmentDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "refund" && <RefundDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "cancel" && <CancelDialog order={o} open onClose={() => setDlg(null)} />}
      {dlg === "contact" && <ContactDialog order={o} open onClose={() => setDlg(null)} />}
    </>
  );
}
