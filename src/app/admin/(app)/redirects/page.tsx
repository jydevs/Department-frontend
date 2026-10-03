"use client";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, PageHeader } from "@/components/admin/ui/Display";
import { Input, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { useDeleteRedirect, useRedirects, useSaveRedirect } from "@/lib/admin/api/content";
import { Can, useCan } from "@/lib/admin/permissions";
import type { Redirect } from "@/lib/admin/types";

const blank: Redirect = { id: "", from: "/", to: "/", permanent: true, hits: 0 };
export default function RedirectsPage() {
  const { data, isLoading } = useRedirects();
  const save = useSaveRedirect(), del = useDeleteRedirect(), confirm = useConfirm();
  const can = useCan("content:write");
  const [edit, setEdit] = useState<Redirect | null>(null);
  const [err, setErr] = useState("");
  const submit = () => edit && save.mutate(edit, { onSuccess: () => setEdit(null), onError: (e) => setErr(e.message) });
  return (
    <>
      <PageHeader title="Redirecciones" description="Evita enlaces rotos cuando cambias o eliminas URLs." actions={<Can perm="content:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setErr(""); setEdit(blank); }}>Nueva redirección</Button></Can>} />
      <DataTable caption="Redirecciones" loading={isLoading} rows={data} rowKey={(r) => r.id} onRowClick={can ? (r) => { setErr(""); setEdit(r); } : undefined}
        columns={[
          { key: "f", header: "Ruta", cell: (r) => <span className="flex items-center gap-2"><code className="text-xs">{r.from}</code><ArrowRight className="size-3.5 text-muted" aria-hidden /><code className="text-xs">{r.to}</code></span> },
          { key: "t", header: "Tipo", cell: (r) => <Badge tone={r.permanent ? "ok" : "warn"}>{r.permanent ? "301 permanente" : "302 temporal"}</Badge> },
          { key: "h", header: "Visitas", sortValue: (r) => r.hits, cell: (r) => r.hits },
          { key: "a", header: "", align: "right", cell: (r) => can ? <span onClick={(e) => e.stopPropagation()}><IconButton label={`Eliminar redirección ${r.from}`} onClick={async () => { if (await confirm({ title: "Eliminar redirección", message: `${r.from} dejará de redirigir.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(r.id); }}><Trash2 className="size-4" /></IconButton></span> : null },
        ]} />
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar redirección" : "Nueva redirección"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar</Button></>}>
        {edit && <div className="space-y-3"><Input label="Desde" value={edit.from} onChange={(e) => { setErr(""); setEdit({ ...edit, from: e.target.value }); }} hint="Ruta que empieza con /" /><Input label="Hacia" value={edit.to} onChange={(e) => { setErr(""); setEdit({ ...edit, to: e.target.value }); }} hint="/ruta o https://…" />
          <label className="flex items-center justify-between text-sm">Permanente (301)<Switch label="Permanente" checked={edit.permanent} onChange={(v) => setEdit({ ...edit, permanent: v })} /></label>{err && <p role="alert" className="text-sm text-red-500">{err}</p>}</div>}
      </Dialog>
    </>
  );
}
