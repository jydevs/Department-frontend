"use client";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, PageHeader } from "@/components/admin/ui/Display";
import { Input, SearchInput, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { isSafeUrl, useDeleteRedirect, useRedirects, useSaveRedirect, type RedirectInput } from "@/lib/admin/api/content";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { isSafePath } from "@/lib/admin/format";
import { Can, useCan } from "@/lib/admin/permissions";

const blank: RedirectInput = { fromPath: "/", toPath: "/", statusCode: 301, isActive: true };
export default function RedirectsPage() {
  const [page, setPage] = useState(1), [q, setQ] = useState("");
  const { data, isLoading, error } = useRedirects(page, q);
  const save = useSaveRedirect(), del = useDeleteRedirect(), confirm = useConfirm();
  const can = useCan("content:write");
  const [edit, setEdit] = useState<RedirectInput | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const submit = () => {
    if (!edit) return;
    const from = edit.fromPath.trim(), to = edit.toPath.trim(), e: Record<string, string> = {};
    if (!isSafePath(from)) e.fromPath = "Debe empezar con / (una sola barra), sin \\ ni espacios";
    if (!(isSafePath(to) || (to.startsWith("https://") && isSafeUrl(to, false)))) e.toPath = "Debe ser /ruta o https://…";
    if (!e.fromPath && from === to) e.toPath = "El origen y el destino no pueden ser iguales";
    setErrs(e);
    if (Object.keys(e).length) return;
    save.mutate({ ...edit, fromPath: from, toPath: to }, { onSuccess: () => setEdit(null), onError: (err) => { if (err instanceof ApiError && err.details.length) setErrs(err.fieldErrors()); else setErrs({ form: errorMessage(err) }); } });
  };
  const open = (r: RedirectInput) => { setErrs({}); setEdit(r); };
  return (
    <>
      <PageHeader title="Redirecciones" description="Evita enlaces rotos cuando cambias o eliminas URLs." actions={<Can perm="content:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => open(blank)}>Nueva redirección</Button></Can>} />
      <div className="mb-3"><SearchInput onSearch={(v) => { setQ(v); setPage(1); }} placeholder="Buscar por origen o destino" className="max-w-sm" /></div>
      <DataTable caption="Redirecciones" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(r) => r.id} onRowClick={can ? (r) => open({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode, isActive: r.isActive }) : undefined}
        pagination={data ? { page: data.page, totalPages: data.totalPages, total: data.total, onChange: setPage } : undefined}
        empty={q ? "Sin resultados para la búsqueda." : "Aún no hay redirecciones."}
        columns={[
          { key: "f", header: "Ruta", cell: (r) => <span className="flex items-center gap-2"><code className="text-xs">{r.fromPath}</code><ArrowRight className="size-3.5 text-muted" aria-hidden /><code className="break-all text-xs">{r.toPath}</code></span> },
          { key: "t", header: "Tipo", cell: (r) => <Badge tone={r.statusCode === 301 ? "ok" : "warn"}>{r.statusCode === 301 ? "301 permanente" : "302 temporal"}</Badge> },
          { key: "s", header: "Estado", cell: (r) => <Badge tone={r.isActive ? "ok" : "neutral"}>{r.isActive ? "Activa" : "Inactiva"}</Badge> },
          { key: "a", header: "", align: "right", cell: (r) => can ? <span onClick={(e) => e.stopPropagation()}><IconButton label={`Eliminar redirección ${r.fromPath}`} onClick={async () => { if (await confirm({ title: "Eliminar redirección", message: `${r.fromPath} dejará de redirigir.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(r.id); }}><Trash2 className="size-4" /></IconButton></span> : null },
        ]} />
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar redirección" : "Nueva redirección"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
        {edit && <div className="space-y-3">
          <Input label="Desde" value={edit.fromPath} error={errs.fromPath} onChange={(e) => { setErrs({}); setEdit({ ...edit, fromPath: e.target.value }); }} hint="Ruta que empieza con /" />
          <Input label="Hacia" value={edit.toPath} error={errs.toPath} onChange={(e) => { setErrs({}); setEdit({ ...edit, toPath: e.target.value }); }} hint="/ruta o https://…" />
          <label className="flex items-center justify-between text-sm">Permanente (301)<Switch label="Permanente" checked={edit.statusCode === 301} onChange={(v) => setEdit({ ...edit, statusCode: v ? 301 : 302 })} /></label>
          <label className="flex items-center justify-between text-sm">Activa<Switch label="Activa" checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} /></label>
          {errs.form && <p role="alert" className="text-sm text-accent-text">{errs.form}</p>}
        </div>}
      </Dialog>
    </>
  );
}
