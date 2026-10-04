"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { Input, Switch, TagInput, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useAnonymize, useCustomer, useSaveCustomer } from "@/lib/admin/api/admin";
import { useAuth } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/admin/format";
import { optionalPhone } from "@/lib/admin/validate";
import type { Customer } from "@/lib/admin/types";

const ORDER_STATUS: Record<string, string> = { pending: "Pendiente", paid: "Pagado", failed: "Fallido", refunded: "Reembolsado", partially_refunded: "Reembolso parcial", unfulfilled: "Sin enviar", partial: "Envío parcial", fulfilled: "Enviado", cancelled: "Cancelado", open: "Abierto", completed: "Completado" };
const label = (s: string) => ORDER_STATUS[s] ?? s;

function Editor({ initial }: { initial: Customer }) {
  const [c, setC] = useState(initial);
  const { user } = useAuth();
  const can = useCan("customers:write"), confirm = useConfirm();
  const canErase = can && (user?.role === "owner" || user?.role === "admin");
  const save = useSaveCustomer(), anon = useAnonymize();
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);
  let phoneErr: string | undefined;
  try { optionalPhone(c.phone, "El teléfono"); } catch (e) { phoneErr = e instanceof Error ? e.message : "Teléfono no válido"; }
  return (
    <Card title="Datos del cliente" actions={can && !c.anonymized ? <Button size="sm" variant="primary" loading={save.isPending} disabled={!dirty || !!phoneErr} onClick={() => save.mutate(c)}>Guardar</Button> : undefined}>
      <fieldset disabled={!can || c.anonymized} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2"><Input label="Nombre" value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} /><Input label="Apellido" value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} /></div>
        <Input label="Correo" type="email" value={c.email} disabled hint="El correo no se puede editar desde el panel." />
        <Input label="Teléfono" type="tel" value={c.phone} placeholder="+573001234567" error={phoneErr} hint="Solo números (7 a 20 dígitos); puedes usar espacios o guiones." onChange={(e) => setC({ ...c, phone: e.target.value })} /><TagInput label="Etiquetas" value={c.tags} onChange={(tags) => setC({ ...c, tags })} />
        <Textarea label="Nota interna" rows={3} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} />
        <label className="flex items-center justify-between text-sm">Cuenta activa (puede iniciar sesión)<Switch label="Cuenta activa" checked={c.isActive} onChange={(v) => setC({ ...c, isActive: v })} /></label>
        <p className="text-xs text-muted">Acepta marketing: <b>{c.marketing ? "Sí" : "No"}</b> (lo decide el cliente; solo cuenta con el correo verificado: {c.emailVerified ? "verificado" : "sin verificar"}).</p>
      </fieldset>
      {canErase && !c.anonymized && <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-sm font-medium text-accent-text">Zona de riesgo</p><p className="mb-2 text-xs text-muted">Anonimizar borra los datos personales de forma irreversible (Habeas Data). Los pedidos se conservan sin identificar al cliente. Solo propietarios y administradores.</p>
        <Button variant="danger" loading={anon.isPending} onClick={async () => { if (await confirm({ title: "Anonimizar cliente", message: `Se borrarán nombre, correo, teléfono y direcciones de ${c.name}. No se puede deshacer.`, danger: true, confirmLabel: "Anonimizar", typeToConfirm: "ANONIMIZAR" })) anon.mutate(c.id); }}>Anonimizar cliente</Button></div>}
    </Card>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCustomer(id);
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <EmptyState title={error ? "No se pudo cargar el cliente" : "Cliente no encontrado"} text={error ? errorMessage(error) : undefined} action={<Link href="/admin/customers" className="text-accent-text underline">Volver a clientes</Link>} />;
  const { customer: c, orders } = data;
  return (
    <>
      <PageHeader title={c.name} breadcrumbs={[{ label: "Clientes", href: "/admin/customers" }, { label: c.name }]} description={`${orders.length >= 100 ? "100 o más" : orders.length} pedidos · cliente desde ${formatDate(c.createdAt)}${c.lastLoginAt ? " · último acceso " + formatDate(c.lastLoginAt) : ""}`} actions={c.anonymized ? <Badge tone="danger">Anonimizado</Badge> : undefined} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Pedidos" pad={false}>{orders.length === 0 ? <EmptyState title="Sin pedidos" /> : <ul>{orders.length >= 100 && <li className="border-b border-line px-4 py-2 text-xs text-muted">Se muestran los 100 pedidos más recientes.</li>}{orders.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-surface2/60"><span className="font-medium">#{o.number} <span className="font-normal text-muted"><DateTime value={o.createdAt} /></span></span><span className="flex items-center gap-2"><Badge tone={o.paymentStatus === "paid" ? "ok" : "neutral"}>{label(o.paymentStatus)}</Badge><Badge tone={o.fulfillmentStatus === "fulfilled" ? "ok" : "warn"}>{label(o.fulfillmentStatus)}</Badge><Money value={o.total} /></span></Link></li>)}</ul>}</Card>
          <Card title="Direcciones">{c.addresses.length === 0 ? <p className="text-sm text-muted">Sin direcciones.</p> : <ul className="grid gap-3 sm:grid-cols-2">{c.addresses.map((a, i) => <li key={i}><address className="rounded-sm border border-line p-3 text-sm not-italic">{a.name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.department}<br />{a.phone}</address></li>)}</ul>}</Card>
        </div>
        <Editor key={`${c.id}-${c.firstName}-${c.lastName}-${c.phone}-${c.tags.join()}-${c.note}-${c.isActive}-${c.anonymized}`} initial={c} />
      </div>
    </>
  );
}
