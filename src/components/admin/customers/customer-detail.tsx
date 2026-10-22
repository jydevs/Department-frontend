"use client";

import { useState } from "react";
import { Link } from "@/lib/admin/navigation";
import { useRouter } from "@/lib/admin/navigation";
import { MapPin, ShieldAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DateTime,
  EmptyState,
  ErrorState,
  Input,
  Money,
  PageHeader,
  Skeleton,
  StatusBadge,
  Switch,
  TagInput,
  Textarea,
  useConfirm,
  useToast,
  type DataTableColumn,
} from "@/components/admin/ui";
import { Notice, fieldErrorsOf, formErrorOf, isOwnerOrAdmin, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { useAuth } from "@/lib/admin/auth";
import { Can, useCan } from "@/lib/admin/permissions";

import { useCustomer, useEraseCustomer, useUpdateCustomer, type CustomerDetail, type CustomerOrder } from "@/lib/admin/api/customers";
import { MarketingBadge } from "./customers-page";

function CustomerForm({ customer, canWrite }: { customer: CustomerDetail; canWrite: boolean }) {
  const toast = useToast();
  const update = useUpdateCustomer(customer.id);
  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [tags, setTags] = useState(customer.tags);
  const [note, setNote] = useState(customer.internalNote ?? "");
  const [isActive, setIsActive] = useState(customer.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const disabled = !canWrite || !!customer.anonymizedAt;

  const dirty =
    firstName !== customer.firstName ||
    lastName !== customer.lastName ||
    phone !== (customer.phone ?? "") ||
    note !== (customer.internalNote ?? "") ||
    isActive !== customer.isActive ||
    tags.join("\u0000") !== customer.tags.join("\u0000");

  const save = async () => {
    setErrors({});
    setFormError(null);
    const local: Record<string, string> = {};
    if (!firstName.trim()) local.firstName = "Obligatorio";
    if (!lastName.trim()) local.lastName = "Obligatorio";
    if (phone.trim() && !/^\+?[0-9]{7,20}$/.test(phone.trim())) local.phone = "Solo dígitos, de 7 a 20 (puede empezar con +)";
    if (Object.keys(local).length) return setErrors(local);
    try {
      await update.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() ? phone.trim() : null,
        tags,
        internalNote: note.trim() ? note : null,
        isActive,
      });
      toast.success("Cliente actualizado");
    } catch (e) {
      setErrors(fieldErrorsOf(e));
      setFormError(formErrorOf(e));
      toast.error(apiMessage(e));
    }
  };

  return (
    <Card title="Datos del cliente" description={customer.email}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} disabled={disabled} maxLength={120} required />
        <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} disabled={disabled} maxLength={120} required />
        <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} disabled={disabled} inputMode="tel" placeholder="+573001234567" />
        <div className="flex items-end pb-1">
          <Switch checked={isActive} onChange={setIsActive} disabled={disabled} label="Cuenta activa" hint="Si la desactivas se cierran sus sesiones." />
        </div>
        <div className="sm:col-span-2">
          <TagInput label="Etiquetas" value={tags} onChange={setTags} disabled={disabled} error={errors.tags} hint="Hasta 50 etiquetas de 50 caracteres." maxLength={50} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Nota interna" value={note} onChange={(e) => setNote(e.target.value)} disabled={disabled} maxLength={5000} rows={4} hint="Solo la ve el equipo." error={errors.internalNote} />
        </div>
      </div>
      {formError ? <p role="alert" className="mt-3 text-sm text-danger">{formError}</p> : null}
      {!disabled ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="primary" onClick={save} loading={update.isPending} disabled={!dirty}>
            Guardar cambios
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function CustomerDetailPage({ id }: { id: string }) {
  return (
    <PermissionGate perm="customers:read">
      <CustomerDetailPageInner id={id} />
    </PermissionGate>
  );
}

function CustomerDetailPageInner({ id }: { id: string }) {
  const canWrite = useCan("customers:write");
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const query = useCustomer(id);
  const erase = useEraseCustomer(id);

  if (query.isPending) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const c = query.data;
  const fullName = c.anonymizedAt ? "Cliente anonimizado" : `${c.firstName} ${c.lastName}`.trim();

  const onErase = async () => {
    const ok = await confirm({
      title: "Anonimizar cliente",
      description: "Se borrarán de forma irreversible sus datos personales (nombre, correo, teléfono, direcciones). Los pedidos se conservan sin datos personales.",
      confirmLabel: "Anonimizar",
      tone: "danger",
      requireText: c.email,
    });
    if (!ok) return;
    try {
      await erase.mutateAsync();
      toast.success("Cliente anonimizado");
      router.push("/customers");
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  const orderColumns: DataTableColumn<CustomerOrder>[] = [
    {
      key: "number",
      header: "Pedido",
      cell: (o) => (
        <Link href={`/orders/${o.id}`} className="font-medium text-accent-text hover:underline">
          #{o.orderNumber}
        </Link>
      ),
    },
    { key: "date", header: "Fecha", cell: (o) => <DateTime value={o.createdAt} /> },
    { key: "status", header: "Estado", cell: (o) => <StatusBadge status={o.status} /> },
    { key: "payment", header: "Pago", hideOnMobile: true, cell: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "fulfillment", header: "Envío", hideOnMobile: true, cell: (o) => <StatusBadge status={o.fulfillmentStatus} /> },
    { key: "total", header: "Total", align: "right", cell: (o) => <Money value={o.total} /> },
  ];

  const spent = c.orders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_refunded").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title={fullName || c.email}
        breadcrumbs={[{ label: "Clientes", href: "/customers" }, { label: fullName || c.email }]}
        meta={c.anonymizedAt ? <Badge>Anonimizado</Badge> : c.isActive ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="danger" dot>Desactivado</Badge>}
      />
      {c.anonymizedAt ? (
        <Notice tone="warning" title="Cliente anonimizado" className="mb-4">
          Sus datos personales se eliminaron el <DateTime value={c.anonymizedAt} />. Ya no se puede editar.
        </Notice>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <CustomerForm key={c.updatedAt} customer={c} canWrite={canWrite} />
          <Card title="Pedidos" description={c.orders.length ? `${c.orders.length} pedido(s)${c.orders.length >= 100 ? " (se muestran los 100 más recientes)" : ""}` : undefined} flush>
            <DataTable
              aria-label="Pedidos del cliente"
              columns={orderColumns}
              rows={c.orders}
              getRowId={(o) => o.id}
              className="rounded-none border-0"
              empty={<EmptyState title="Sin pedidos" description="Este cliente todavía no ha comprado." />}
            />
          </Card>
          <Card title="Direcciones">
            {c.addresses.length === 0 ? (
              <p className="text-sm text-muted">Sin direcciones guardadas.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {c.addresses.map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-surface-2 p-3 text-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <MapPin aria-hidden size={14} className="text-muted" />
                      <span className="font-medium">{a.label ?? "Dirección"}</span>
                      {a.isDefault ? <Badge tone="info">Predeterminada</Badge> : null}
                    </div>
                    <p>{a.fullName}</p>
                    <p>{a.address1}{a.address2 ? `, ${a.address2}` : ""}</p>
                    <p>{a.city}, {a.department}{a.postalCode ? ` · ${a.postalCode}` : ""}</p>
                    <p className="text-muted">{a.phone}</p>
                    {a.documentType ? <p className="text-muted">{a.documentType} {a.documentNumber}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <aside className="space-y-5">
          <Card title="Resumen">
            <dl className="space-y-2.5 text-sm">
              <Row label="Correo">{c.anonymizedAt ? "—" : c.email}</Row>
              <Row label="Pedidos">{c.orders.length}</Row>
              <Row label="Gastado (pagado)"><Money value={spent} /></Row>
              <Row label="Cuenta">{c.hasAccount ? "Registrado" : "Invitado (sin cuenta)"}</Row>
              <Row label="Alta"><DateTime value={c.createdAt} /></Row>
              <Row label="Último acceso"><DateTime value={c.lastLoginAt} /></Row>
            </dl>
          </Card>
          <Card title="Consentimiento de marketing">
            <div className="space-y-2 text-sm">
              <MarketingBadge customer={c} />
              <p className="text-muted">
                {c.acceptsMarketing && c.emailVerified
                  ? <>Aceptó recibir marketing el <DateTime value={c.marketingConsentAt} mode="date" />.</>
                  : c.acceptsMarketing
                    ? "Marcó que acepta marketing, pero su correo aún no está verificado: no se le puede escribir hasta entonces."
                    : "No ha dado su consentimiento."}
              </p>
              <p className="text-muted">Correo {c.emailVerified ? "verificado" : "sin verificar"}.</p>
            </div>
          </Card>
          <Can perm="customers:write">
            {isOwnerOrAdmin(user?.role) && !c.anonymizedAt ? (
              <Card title="Zona de peligro">
                <p className="mb-3 text-sm text-muted">Anonimizar elimina sus datos personales de forma irreversible (derecho de supresión).</p>
                <Button variant="danger" leftIcon={<ShieldAlert aria-hidden size={15} />} onClick={onErase} loading={erase.isPending}>
                  Anonimizar cliente
                </Button>
              </Card>
            ) : null}
          </Can>
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
