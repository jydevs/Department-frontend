"use client";

import { useState } from "react";
import { ArrowRight, Plus, Waypoints } from "lucide-react";
import { Badge, Button, Card, DataTable, DateTime, Dialog, EmptyState, Input, NoAccess, PageHeader, SearchInput, Select, Switch, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { usePaged } from "@/lib/admin/query";
import { useCreateRedirect, useDeleteRedirect, useUpdateRedirect, validateFromPath, validateToPath, type RedirectInput, type RedirectItem } from "@/lib/admin/api/redirects";

const PAGE_SIZE = 25;

interface FormState {
  fromPath: string;
  toPath: string;
  statusCode: "301" | "302";
  isActive: boolean;
}

const EMPTY: FormState = { fromPath: "", toPath: "", statusCode: "301", isActive: true };

/** Diálogo de creación / edición. Se reutiliza desde la lista de páginas (sugerencia tras eliminar). */
export function RedirectDialog({ open, onClose, initial, editing, onSaved }: { open: boolean; onClose: () => void; initial?: Partial<FormState>; editing?: RedirectItem | null; onSaved?: (r: RedirectItem) => void }) {
  if (!open) return null;
  return <RedirectForm key={editing?.id ?? "new"} onClose={onClose} initial={initial} editing={editing ?? null} onSaved={onSaved} />;
}

function RedirectForm({ onClose, initial, editing, onSaved }: { onClose: () => void; initial?: Partial<FormState>; editing: RedirectItem | null; onSaved?: (r: RedirectItem) => void }) {
  const toast = useToast();
  const create = useCreateRedirect();
  const update = useUpdateRedirect();
  const [form, setForm] = useState<FormState>(
    editing ? { fromPath: editing.fromPath, toPath: editing.toPath, statusCode: editing.statusCode === 302 ? "302" : "301", isActive: editing.isActive } : { ...EMPTY, ...initial },
  );
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const busy = create.isPending || update.isPending;

  const fromErr = touched ? validateFromPath(form.fromPath) : null;
  const toErr = touched ? validateToPath(form.toPath) : null;
  const loopHint = form.fromPath.trim() && form.fromPath.trim().toLowerCase().replace(/\/+$/, "") === form.toPath.trim().toLowerCase().replace(/\/+$/, "") ? "El origen y el destino no pueden ser iguales." : null;

  const submit = async () => {
    setTouched(true);
    if (validateFromPath(form.fromPath) || validateToPath(form.toPath) || loopHint) return;
    const body: RedirectInput = { fromPath: form.fromPath.trim(), toPath: form.toPath.trim(), statusCode: form.statusCode === "302" ? 302 : 301, isActive: form.isActive };
    setServerErrors({});
    try {
      const saved = editing ? await update.mutateAsync({ id: editing.id, patch: body }) : await create.mutateAsync(body);
      toast.success(editing ? "Redirección actualizada" : "Redirección creada");
      onSaved?.(saved);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") setServerErrors(e.fieldErrors());
      else if (e instanceof ApiError && e.code === "CONFLICT") setServerErrors({ fromPath: e.message });
      else toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      title={editing ? "Editar redirección" : "Nueva redirección"}
      description="Cuando alguien visite la ruta de origen, la tienda lo llevará al destino."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>
            {editing ? "Guardar cambios" : "Crear redirección"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Desde (ruta antigua)" required placeholder="/pages/sobre-nosotros" value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} error={serverErrors.fromPath ?? fromErr ?? loopHint} hint="Empieza por /. Se ignoran la consulta (?…) y la barra final." autoFocus />
        <Input label="Hacia (destino)" required placeholder="/pages/nosotros o https://…" value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} error={serverErrors.toPath ?? toErr} hint="Una ruta del sitio (/ruta) o una URL https://." />
        <Select
          label="Tipo"
          value={form.statusCode}
          onChange={(e) => setForm({ ...form, statusCode: e.target.value === "302" ? "302" : "301" })}
          options={[
            { value: "301", label: "301 — Permanente (recomendado para SEO)" },
            { value: "302", label: "302 — Temporal" },
          ]}
        />
        <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Activa" hint="Si la desactivas, la tienda deja de aplicarla." />
      </form>
    </Dialog>
  );
}

export function RedirectsView() {
  const canRead = useCan("content:read");
  const canWrite = useCan("content:write");
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<{ editing: RedirectItem | null } | null>(null);
  const list = usePaged<RedirectItem>(["redirects"], "/admin/redirects", { page, pageSize, q }, { enabled: canRead });
  const update = useUpdateRedirect();
  const del = useDeleteRedirect();

  if (!canRead) return <NoAccess permission="content:read" />;

  const columns: DataTableColumn<RedirectItem>[] = [
    {
      key: "path",
      header: "Origen → destino",
      cell: (r) => (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{r.fromPath}</code>
          <ArrowRight aria-hidden size={14} className="shrink-0 text-muted" />
          <code className="max-w-[320px] truncate rounded bg-surface-2 px-1.5 py-0.5 text-xs">{r.toPath}</code>
        </div>
      ),
    },
    { key: "status", header: "Tipo", width: "90px", cell: (r) => <Badge tone={r.statusCode === 301 ? "info" : "neutral"}>{r.statusCode}</Badge> },
    {
      key: "active",
      header: "Estado",
      width: "120px",
      cell: (r) =>
        canWrite ? (
          <Switch
            checked={r.isActive}
            aria-label={`Redirección ${r.fromPath} ${r.isActive ? "activa" : "inactiva"}`}
            onChange={async (v) => {
              try {
                await update.mutateAsync({ id: r.id, patch: { isActive: v } });
                toast.success(v ? "Redirección activada" : "Redirección desactivada");
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          />
        ) : (
          <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Activa" : "Inactiva"}</Badge>
        ),
    },
    { key: "created", header: "Creada", width: "130px", hideOnMobile: true, cell: (r) => <DateTime value={r.createdAt} mode="date" /> },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "170px",
      cell: (r) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setDialog({ editing: r })}>
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                if (!(await confirm({ title: "¿Eliminar esta redirección?", description: `${r.fromPath} dejará de redirigir.`, confirmLabel: "Eliminar", tone: "danger" }))) return;
                try {
                  await del.mutateAsync(r.id);
                  toast.success("Redirección eliminada");
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Redirecciones"
        description="Evita enlaces rotos cuando cambias o eliminas páginas: lleva a los visitantes a la ruta nueva."
        actions={
          canWrite ? (
            <Button variant="primary" leftIcon={<Plus aria-hidden size={16} />} onClick={() => setDialog({ editing: null })}>
              Nueva redirección
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar por ruta…"
          className="max-w-sm"
        />
      </div>
      <Card flush>
        <DataTable<RedirectItem>
          aria-label="Redirecciones"
          columns={columns}
          rows={list.data?.items ?? []}
          getRowId={(r) => r.id}
          loading={list.isPending}
          error={list.error ?? undefined}
          onRetry={() => void list.refetch()}
          empty={
            <EmptyState
              icon={<Waypoints aria-hidden size={22} />}
              title={q ? "Sin resultados" : "Aún no hay redirecciones"}
              description={q ? "Prueba con otra ruta." : "Crea una para llevar una ruta antigua a una nueva."}
              action={
                canWrite && !q ? (
                  <Button variant="primary" onClick={() => setDialog({ editing: null })}>
                    Nueva redirección
                  </Button>
                ) : undefined
              }
            />
          }
          pagination={list.data ? { page, pageSize, total: list.data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
        />
      </Card>
      <RedirectDialog open={dialog !== null} editing={dialog?.editing ?? null} onClose={() => setDialog(null)} />
    </>
  );
}
