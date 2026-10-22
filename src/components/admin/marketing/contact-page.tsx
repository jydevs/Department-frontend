"use client";

import { useState } from "react";
import { Mail, MessageSquare, Trash2 } from "lucide-react";
import { Button, DataTable, DateTime, Drawer, EmptyState, PageHeader, SearchInput, Select, StatusBadge, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { useCan } from "@/lib/admin/permissions";

import { safeHref } from "@/lib/admin/utils";
import { truncate } from "@/lib/admin/format";
import { CONTACT_STATUS_LABELS, useContactMessages, useDeleteContact, useSetContactStatus, type ContactMessage, type ContactStatus } from "@/lib/admin/api/marketing";

const STATUSES = Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[];

function MessageDrawer({ message, canWrite, onClose }: { message: ContactMessage; canWrite: boolean; onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const setStatus = useSetContactStatus();
  const remove = useDeleteContact();
  const tel = message.phone ? safeHref(`tel:${message.phone}`) : undefined;
  const mail = safeHref(`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? "Tu mensaje"}`)}`);

  const change = async (status: ContactStatus) => {
    try {
      await setStatus.mutateAsync({ id: message.id, status });
      toast.success(`Marcado como «${CONTACT_STATUS_LABELS[status]}»`);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };
  const del = async () => {
    if (!(await confirm({ title: "Eliminar mensaje", description: "Se eliminará de forma permanente.", confirmLabel: "Eliminar", tone: "danger" }))) return;
    try {
      await remove.mutateAsync(message.id);
      toast.success("Mensaje eliminado");
      onClose();
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={message.subject || "Mensaje sin asunto"}
      description={`De ${message.name} · ${message.email}${message.phone ? ` · ${message.phone}` : ""}`}
      footer={
        <>
          {canWrite ? (
            <Button variant="danger" leftIcon={<Trash2 aria-hidden size={14} />} onClick={del} loading={remove.isPending} className="mr-auto">
              Eliminar
            </Button>
          ) : null}
          {mail ? (
            <a href={mail} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-4 text-sm font-medium hover:bg-surface-3">
              <Mail aria-hidden size={14} /> Responder por correo
            </a>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge status={message.status} label={CONTACT_STATUS_LABELS[message.status]} />
          <span className="text-muted">
            <DateTime value={message.createdAt} />
          </span>
        </div>
        {message.phone ? (
          <p className="text-sm">
            <span className="text-muted">Teléfono: </span>
            {tel ? (
              <a href={tel} className="text-accent hover:underline">
                {message.phone}
              </a>
            ) : (
              message.phone
            )}
          </p>
        ) : null}
        <p className="rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
        {canWrite ? (
          <div>
            <p className="mb-2 text-[13px] font-medium">Estado</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Cambiar estado">
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={message.status === s ? "primary" : "secondary"} aria-pressed={message.status === s} disabled={message.status === s || setStatus.isPending} onClick={() => change(s)}>
                  {CONTACT_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {message.ip ? <p className="text-xs text-muted">IP (truncada): {message.ip}</p> : null}
      </div>
    </Drawer>
  );
}

export function ContactPage() {
  return (
    <PermissionGate perm="marketing:read">
      <ContactPageInner />
    </PermissionGate>
  );
}

function ContactPageInner() {
  const canWrite = useCan("marketing:write");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useContactMessages({ status, q, page, pageSize });


  const data = query.data;
  const open = data?.items.find((m) => m.id === openId) ?? null;
  const columns: DataTableColumn<ContactMessage>[] = [
    {
      key: "from",
      header: "Remitente",
      cell: (m) => (
        <div className="min-w-0">
          <p className={m.status === "new" ? "truncate font-semibold" : "truncate font-medium"}>{m.name}</p>
          <p className="truncate text-xs text-muted">{m.email}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Asunto y mensaje",
      hideOnMobile: true,
      cell: (m) => (
        <div className="max-w-md min-w-0">
          <p className="truncate">{m.subject || <span className="text-muted">Sin asunto</span>}</p>
          <p className="truncate text-xs text-muted">{truncate(m.message, 90)}</p>
        </div>
      ),
    },
    { key: "status", header: "Estado", cell: (m) => <StatusBadge status={m.status} label={CONTACT_STATUS_LABELS[m.status]} /> },
    { key: "date", header: "Recibido", hideOnMobile: true, cell: (m) => <DateTime value={m.createdAt} mode="relative" /> },
  ];

  return (
    <>
      <PageHeader title="Mensajes de contacto" description="Mensajes enviados desde el formulario de contacto de la tienda." />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Buscar por nombre, correo o texto…" label="Buscar mensajes" />
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[{ value: "", label: "Estado: todos" }, ...STATUSES.map((s) => ({ value: s, label: CONTACT_STATUS_LABELS[s] }))]}
        />
      </div>
      <DataTable
        aria-label="Mensajes de contacto"
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(m) => m.id}
        onRowClick={(m) => setOpenId(m.id)}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState icon={<MessageSquare aria-hidden size={22} />} title={status || q ? "Ningún mensaje coincide" : "No hay mensajes"} description={status || q ? "Prueba con otros filtros." : "Cuando alguien escriba desde la tienda lo verás aquí."} />}
        pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
      {open ? <MessageDrawer key={open.id} message={open} canWrite={canWrite} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
