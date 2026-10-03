"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { Checkbox, Input, TagInput, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useAnonymize, useCustomer, useSaveCustomer } from "@/lib/admin/api/admin";
import { useCan } from "@/lib/admin/permissions";
import type { Customer } from "@/lib/admin/types";

function Editor({ initial }: { initial: Customer }) {
  const [c, setC] = useState(initial);
  const can = useCan("customers:write"), confirm = useConfirm();
  const save = useSaveCustomer(), anon = useAnonymize();
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);
  return (
    <Card title="Datos del cliente" actions={can && !c.anonymized ? <Button size="sm" variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(c)}>Guardar</Button> : undefined}>
      <fieldset disabled={!can || c.anonymized} className="space-y-3">
        <Input label="Nombre" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /><Input label="Correo" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
        <Input label="Teléfono" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /><TagInput label="Etiquetas" value={c.tags} onChange={(tags) => setC({ ...c, tags })} />
        <Textarea label="Nota interna" rows={3} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} /><Checkbox label="Acepta marketing" checked={c.marketing} onChange={(e) => setC({ ...c, marketing: e.target.checked })} />
      </fieldset>
      {can && !c.anonymized && <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-sm font-medium text-accent-text">Zona de riesgo</p><p className="mb-2 text-xs text-muted">Anonimizar borra los datos personales de forma irreversible (Habeas Data). Los pedidos se conservan sin identificar al cliente.</p>
        <Button variant="danger" loading={anon.isPending} onClick={async () => { if (await confirm({ title: "Anonimizar cliente", message: `Se borrarán nombre, correo, teléfono y direcciones de ${c.name}. No se puede deshacer.`, danger: true, confirmLabel: "Anonimizar", typeToConfirm: "ANONIMIZAR" })) anon.mutate(c.id); }}>Anonimizar cliente</Button></div>}
    </Card>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCustomer(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Cliente no encontrado" />;
  const { customer: c, orders } = data;
  return (
    <>
      <PageHeader title={c.name} breadcrumbs={[{ label: "Clientes", href: "/admin/customers" }, { label: c.name }]} description={`${c.ordersCount} pedidos · cliente desde ${new Date(c.createdAt).toLocaleDateString("es-CO")}`} actions={c.anonymized ? <Badge tone="danger">Anonimizado</Badge> : undefined} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Pedidos" pad={false}>{orders.length === 0 ? <EmptyState title="Sin pedidos" /> : <ul>{orders.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-surface2/60"><span className="font-medium">#{o.number} <span className="font-normal text-muted"><DateTime value={o.createdAt} /></span></span><span className="flex items-center gap-2"><StatusBadge status={o.financial} /><StatusBadge status={o.fulfillment} /><Money value={o.total} /></span></Link></li>)}</ul>}</Card>
          <Card title="Direcciones">{c.addresses.length === 0 ? <p className="text-sm text-muted">Sin direcciones.</p> : <ul className="grid gap-3 sm:grid-cols-2">{c.addresses.map((a, i) => <li key={i}><address className="rounded-sm border border-line p-3 text-sm not-italic">{a.name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.department}<br />{a.phone}</address></li>)}</ul>}</Card>
        </div>
        <Editor key={c.id + c.email + c.anonymized} initial={c} />
      </div>
    </>
  );
}
