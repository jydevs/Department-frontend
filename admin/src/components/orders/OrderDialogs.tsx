"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, MoneyInput, Select, Textarea } from "@/components/ui/Form";
import { Dialog } from "@/components/ui/Overlay";
import { DEPARTMENTS } from "@/lib/mock/seed";
import { formatMoney } from "@/lib/format";
import { useCancelOrder, useCreateShipment, useEditContact, useRefund } from "@/lib/api/orders";
import type { Order } from "@/lib/types";

export function ShipmentDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const m = useCreateShipment();
  const [carrier, setCarrier] = useState("Servientrega");
  const [tracking, setTracking] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const pending = order.lines.filter((l) => l.fulfilledQty < l.qty);
  return (
    <Dialog open={open} onClose={onClose} title="Crear envío"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} disabled={!tracking} onClick={() => m.mutate({ id: order.id, carrier, tracking, qty }, { onSuccess: onClose })}>Crear envío</Button></>}>
      <div className="space-y-3">
        {pending.map((l) => {
          const max = l.qty - l.fulfilledQty;
          return (
            <div key={l.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{l.title} <span className="text-muted">· {l.variant}</span></span>
              <Input aria-label={`Cantidad de ${l.title}`} type="number" min={0} max={max} className="w-20" value={qty[l.id] ?? 0} onChange={(e) => setQty({ ...qty, [l.id]: Math.min(max, Math.max(0, Number(e.target.value))) })} />
            </div>
          );
        })}
        <Select label="Transportadora" value={carrier} onChange={(e) => setCarrier(e.target.value)}><option>Servientrega</option><option>Interrapidísimo</option><option>Coordinadora</option><option>Envía</option></Select>
        <Input label="Número de guía" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        <Button size="sm" onClick={() => setQty(Object.fromEntries(pending.map((l) => [l.id, l.qty - l.fulfilledQty])))}>Enviar todo</Button>
      </div>
    </Dialog>
  );
}

export function RefundDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const m = useRefund();
  const refunded = order.refunds.reduce((s, r) => s + r.amount, 0);
  const available = order.total - refunded;
  const [amount, setAmount] = useState<number | undefined>(available);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});
  const err = amount !== undefined && amount > available ? `Máximo ${formatMoney(available)}` : undefined;
  return (
    <Dialog open={open} onClose={onClose} title="Reembolsar"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} disabled={!amount || !!err} onClick={() => m.mutate({ id: order.id, amount: amount ?? 0, reason, restock, qty }, { onSuccess: onClose })}>Reembolsar {amount ? formatMoney(amount) : ""}</Button></>}>
      <div className="space-y-3">
        {order.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{l.title} <span className="text-muted">· {l.variant}</span></span>
            <Input aria-label={`Unidades a reembolsar de ${l.title}`} type="number" min={0} max={l.qty - l.refundedQty} className="w-20" value={qty[l.id] ?? 0} onChange={(e) => { const n = Math.min(l.qty - l.refundedQty, Math.max(0, Number(e.target.value))); const next = { ...qty, [l.id]: n }; setQty(next); setAmount(Math.min(available, order.lines.reduce((s, x) => s + (next[x.id] ?? 0) * x.price, 0))); }} />
          </div>
        ))}
        <MoneyInput label="Monto a reembolsar" value={amount} onChange={setAmount} error={err} hint={`Disponible: ${formatMoney(available)}`} />
        <Input label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Checkbox label="Reponer stock de las unidades reembolsadas" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
      </div>
    </Dialog>
  );
}

export function CancelDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const m = useCancelOrder();
  const [restock, setRestock] = useState(true);
  return (
    <Dialog open={open} onClose={onClose} title={`Cancelar pedido #${order.number}`} size="sm"
      footer={<><Button onClick={onClose}>Volver</Button><Button variant="danger" loading={m.isPending} onClick={() => m.mutate({ id: order.id, restock }, { onSuccess: onClose })}>Cancelar pedido</Button></>}>
      <p className="mb-3 text-sm text-muted">Esta acción no se puede deshacer.</p>
      <Checkbox label="Reponer el stock de los productos" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
    </Dialog>
  );
}

export function ContactDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const m = useEditContact();
  const [email, setEmail] = useState(order.customer.email);
  const [phone, setPhone] = useState(order.customer.phone);
  const [a, setA] = useState(order.shippingAddress);
  const up = (p: Partial<typeof a>) => setA({ ...a, ...p });
  return (
    <Dialog open={open} onClose={onClose} title="Editar contacto y dirección"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate({ id: order.id, email, phone, address: a }, { onSuccess: onClose })}>Guardar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Nombre" value={a.name} onChange={(e) => up({ name: e.target.value })} className="sm:col-span-2" />
        <Input label="Dirección" value={a.line1} onChange={(e) => up({ line1: e.target.value })} />
        <Input label="Complemento" value={a.line2 ?? ""} onChange={(e) => up({ line2: e.target.value })} />
        <Input label="Ciudad" value={a.city} onChange={(e) => up({ city: e.target.value })} />
        <Select label="Departamento" value={a.department} onChange={(e) => up({ department: e.target.value })}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>
      </div>
    </Dialog>
  );
}

export function NoteForm({ onAdd, busy }: { onAdd: (t: string) => void; busy: boolean }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-2">
      <Textarea aria-label="Nueva nota interna" rows={2} placeholder="Nota interna (no visible para el cliente)" value={t} onChange={(e) => setT(e.target.value)} />
      <Button size="sm" loading={busy} disabled={!t.trim()} onClick={() => { onAdd(t.trim()); setT(""); }}>Agregar nota</Button>
    </div>
  );
}
