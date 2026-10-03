"use client";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Checkbox, Input, MoneyInput, Select, Textarea } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { DEPARTMENTS } from "@/lib/geo";
import { formatMoney } from "@/lib/admin/format";
import { refundableAmount, shippableQty, useCancelOrder, useCreateShipment, useEditContact, useMarkPaid, useRefund } from "@/lib/admin/api/orders";
import type { Order } from "@/lib/admin/types";

interface DP { order: Order; open: boolean; onClose: () => void }
const isHttps = (v: string) => { try { return new URL(v).protocol === "https:"; } catch { return false; } };

export function MarkPaidDialog({ order, open, onClose }: DP) {
  const m = useMarkPaid();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onClose={onClose} title={`Marcar pagado · pedido #${order.number}`} size="sm"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate({ id: order.id, reference, note }, { onSuccess: onClose })}>Marcar pagado</Button></>}>
      <p className="mb-3 text-sm text-muted">Se registrará un pago manual por {formatMoney(order.total)}, el pedido pasará a abierto y se enviará la confirmación al cliente.</p>
      <div className="space-y-3">
        <Input label="Referencia del pago (opcional)" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
        <Textarea label="Nota (opcional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Dialog>
  );
}

export function ShipmentDialog({ order, open, onClose }: DP) {
  const m = useCreateShipment();
  const [carrier, setCarrier] = useState("Servientrega");
  const [tracking, setTracking] = useState("");
  const [url, setUrl] = useState("");
  const [notify, setNotify] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});
  const pending = order.lines.filter((l) => shippableQty(l) > 0);
  const total = Object.values(qty).reduce((s, n) => s + n, 0);
  const urlErr = url && !isHttps(url) ? "Debe ser un enlace https válido" : undefined;
  return (
    <Dialog open={open} onClose={onClose} title="Crear envío"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} disabled={total === 0 || !!urlErr} onClick={() => m.mutate({ id: order.id, carrier, tracking, trackingUrl: url, notify, qty }, { onSuccess: onClose })}>Crear envío</Button></>}>
      <div className="space-y-3">
        {pending.map((l) => {
          const max = shippableQty(l);
          return (
            <div key={l.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{l.title} <span className="text-muted">· {l.variant} · pendientes {max}</span></span>
              <Input aria-label={`Cantidad de ${l.title}`} type="number" min={0} max={max} className="w-20" value={qty[l.id] ?? 0} onChange={(e) => setQty({ ...qty, [l.id]: Math.min(max, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) })} />
            </div>
          );
        })}
        <Button size="sm" onClick={() => setQty(Object.fromEntries(pending.map((l) => [l.id, shippableQty(l)])))}>Enviar todo</Button>
        <Select label="Transportadora" value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="">Sin transportadora</option><option>Servientrega</option><option>Interrapidísimo</option><option>Coordinadora</option><option>Envía</option><option>Deprisa</option></Select>
        <Input label="Número de guía (opcional)" value={tracking} maxLength={120} onChange={(e) => setTracking(e.target.value)} />
        <Input label="Enlace de rastreo (opcional)" type="url" placeholder="https://" value={url} maxLength={500} error={urlErr} onChange={(e) => setUrl(e.target.value)} />
        <Checkbox label="Avisar al cliente por correo" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
      </div>
    </Dialog>
  );
}

export function RefundDialog({ order, open, onClose }: DP) {
  const m = useRefund();
  const available = refundableAmount(order);
  const [amount, setAmount] = useState<number | undefined>(available);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});
  const anyLines = Object.values(qty).some((n) => n > 0);
  const err = amount !== undefined && amount > available ? `Máximo ${formatMoney(available)}` : undefined;
  return (
    <Dialog open={open} onClose={onClose} title="Reembolsar"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} disabled={!amount || !!err} onClick={() => m.mutate({ id: order.id, amount: amount ?? 0, reason, restock: restock && anyLines, qty }, { onSuccess: onClose })}>Reembolsar {amount ? formatMoney(amount) : ""}</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-muted">Registra el reembolso en el pedido. El dinero se devuelve manualmente desde el panel de la pasarela de pago.</p>
        {order.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{l.title} <span className="text-muted">· {l.variant}</span></span>
            <Input aria-label={`Unidades a reembolsar de ${l.title}`} type="number" min={0} max={l.qty - l.refundedQty} className="w-20" value={qty[l.id] ?? 0}
              onChange={(e) => { const n = Math.min(l.qty - l.refundedQty, Math.max(0, Math.trunc(Number(e.target.value)) || 0)); const next = { ...qty, [l.id]: n }; setQty(next); setAmount(Math.min(available, order.lines.reduce((s, x) => s + (next[x.id] ?? 0) * x.price, 0)) || undefined); }} />
          </div>
        ))}
        <MoneyInput label="Monto a reembolsar" value={amount} onChange={setAmount} error={err} hint={`Disponible: ${formatMoney(available)}`} />
        <Input label="Motivo (opcional)" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} />
        <Checkbox label="Reponer stock de las unidades reembolsadas" checked={restock && anyLines} disabled={!anyLines} onChange={(e) => setRestock(e.target.checked)} />
      </div>
    </Dialog>
  );
}

export function CancelDialog({ order, open, onClose }: DP) {
  const m = useCancelOrder();
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const paid = order.status === "open";
  return (
    <Dialog open={open} onClose={onClose} title={`Cancelar pedido #${order.number}`} size="sm"
      footer={<><Button onClick={onClose}>Volver</Button><Button variant="danger" loading={m.isPending} disabled={!reason.trim()} onClick={() => m.mutate({ id: order.id, reason, restock: paid && restock }, { onSuccess: onClose })}>Cancelar pedido</Button></>}>
      <p className="mb-3 text-sm text-muted">Esta acción no se puede deshacer.{paid && " El pedido ya está pagado: quedará con reembolso pendiente."}</p>
      <div className="space-y-3">
        <Input label="Motivo" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} />
        {paid && <Checkbox label="Reponer el stock de los productos" checked={restock} onChange={(e) => setRestock(e.target.checked)} />}
      </div>
    </Dialog>
  );
}

export function ContactDialog({ order, open, onClose }: DP) {
  const m = useEditContact();
  const [email, setEmail] = useState(order.customer.email);
  const [phone, setPhone] = useState(order.customer.phone);
  const [a, setA] = useState(order.shippingAddress);
  const up = (p: Partial<typeof a>) => setA({ ...a, ...p });
  const depts: string[] = [...DEPARTMENTS];
  if (a.department && !depts.includes(a.department)) depts.unshift(a.department);
  return (
    <Dialog open={open} onClose={onClose} title="Editar contacto y dirección"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate({ order, email, phone, address: a }, { onSuccess: onClose })}>Guardar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Teléfono del pedido" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Nombre" value={a.name} onChange={(e) => up({ name: e.target.value })} className="sm:col-span-2" />
        <Input label="Teléfono de entrega" value={a.phone} onChange={(e) => up({ phone: e.target.value })} />
        <Input label="Dirección" value={a.line1} onChange={(e) => up({ line1: e.target.value })} />
        <Input label="Complemento" value={a.line2 ?? ""} onChange={(e) => up({ line2: e.target.value })} />
        <Input label="Ciudad" value={a.city} onChange={(e) => up({ city: e.target.value })} />
        <Select label="Departamento" value={a.department} onChange={(e) => up({ department: e.target.value })}>{depts.map((d) => <option key={d}>{d}</option>)}</Select>
        <Input label="Código postal" value={a.postalCode ?? ""} maxLength={12} onChange={(e) => up({ postalCode: e.target.value })} />
      </div>
    </Dialog>
  );
}

export function NoteForm({ onAdd, busy }: { onAdd: (t: string) => void; busy: boolean }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-2">
      <Textarea aria-label="Nueva nota interna" rows={2} maxLength={2000} placeholder="Nota interna (no visible para el cliente)" value={t} onChange={(e) => setT(e.target.value)} />
      <Button size="sm" loading={busy} disabled={!t.trim()} onClick={() => { onAdd(t.trim()); setT(""); }}>Agregar nota</Button>
    </div>
  );
}
