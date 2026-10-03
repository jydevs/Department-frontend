"use client";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/ui/Display";
import { Input } from "@/components/ui/Form";
import { Dialog, useConfirm } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { docStatus, useCreatePage, useDeletePage, useDocs } from "@/lib/api/content";
import { slugify } from "@/lib/format";
import { Can } from "@/lib/permissions";

export default function PagesList() {
  const router = useRouter(), confirm = useConfirm(), toast = useToast();
  const { data, isLoading } = useDocs();
  const create = useCreatePage(), del = useDeletePage();
  const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [handle, setHandle] = useState("");
  const pages = data?.filter((d) => d.kind === "page");
  const remove = async (key: string, t: string) => {
    if (await confirm({ title: "Eliminar página", message: `Se eliminará “${t}”. Los enlaces a /pages/${key} dejarán de funcionar.`, danger: true, confirmLabel: "Eliminar" }))
      del.mutate(key, { onSuccess: () => toast.success(`Sugerencia: crea una redirección desde /pages/${key} en Redirecciones.`) });
  };
  return (
    <>
      <PageHeader title="Páginas" actions={<Can perm="content:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setTitle(""); setHandle(""); setOpen(true); }}>Nueva página</Button></Can>} />
      <DataTable caption="Páginas" loading={isLoading} rows={pages} rowKey={(p) => p.key} onRowClick={(p) => router.push(`/content/pages/${p.key}`)}
        columns={[
          { key: "t", header: "Título", sortValue: (p) => p.title, cell: (p) => <span className="font-medium">{p.title}</span> },
          { key: "h", header: "Handle", cell: (p) => <code className="text-xs">/pages/{p.key}</code> },
          { key: "s", header: "Estado", cell: (p) => { const s = docStatus(p); return s === "scheduled" ? <Badge tone="info">Programada</Badge> : p.published === null ? <Badge tone="warn">Borrador</Badge> : s === "dirty" ? <Badge tone="warn">Cambios sin publicar</Badge> : <Badge tone="ok">Publicada</Badge>; } },
          { key: "p", header: "Publicada", cell: (p) => (p.publishedAt ? <DateTime value={p.publishedAt} /> : "—") },
          { key: "a", header: "", align: "right", cell: (p) => <Can perm="content:write"><span onClick={(e) => e.stopPropagation()}><IconButton label={`Eliminar ${p.title}`} onClick={() => void remove(p.key, p.title)}><Trash2 className="size-4" /></IconButton></span></Can> },
        ]} />
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva página" size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={create.isPending} disabled={!title.trim()} onClick={() => create.mutate({ title, handle: handle || slugify(title) }, { onSuccess: (key) => { setOpen(false); router.push(`/content/pages/${key}`); } })}>Crear</Button></>}>
        <div className="space-y-3"><Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} /><Input label="Handle (URL)" value={handle} placeholder={slugify(title) || "mi-pagina"} onChange={(e) => setHandle(e.target.value)} hint="Minúsculas, números y guiones." /></div>
      </Dialog>
    </>
  );
}
