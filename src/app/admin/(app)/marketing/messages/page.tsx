"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/admin/ui/Display";
import { Select } from "@/components/admin/ui/Form";
import { Button } from "@/components/admin/ui/Button";
import { Drawer, useConfirm } from "@/components/admin/ui/Overlay";
import { useDeleteMessage, useMessages, useSetMessageStatus } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import type { ContactMessage } from "@/lib/admin/types";

const STATUS = { new: ["Nuevo", "accent"], read: ["Leído", "neutral"], replied: ["Respondido", "ok"], spam: ["Spam", "danger"] } as const;
const Status = ({ s }: { s: ContactMessage["status"] }) => <Badge tone={STATUS[s]?.[1] ?? "neutral"}>{STATUS[s]?.[0] ?? s}</Badge>;

export default function MessagesPage() {
  const [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const { data, isLoading, error } = useMessages(status, page);
  const set = useSetMessageStatus(), del = useDeleteMessage(), can = useCan("marketing:write"), confirm = useConfirm();
  const [sel, setSel] = useState<ContactMessage | null>(null);
  const change = (m: ContactMessage, s: ContactMessage["status"]) => set.mutate({ id: m.id, status: s }, { onSuccess: () => setSel({ ...m, status: s }) });
  return (
    <>
      <PageHeader title="Mensajes de contacto" actions={<Select aria-label="Estado" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44"><option value="">Todos</option><option value="new">Nuevos</option><option value="read">Leídos</option><option value="replied">Respondidos</option><option value="spam">Spam</option></Select>} />
      <DataTable caption="Mensajes de contacto" loading={isLoading} rows={data?.items} rowKey={(m) => m.id} error={error ? errorMessage(error) : undefined}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: setPage }}
        onRowClick={(m) => { setSel(m); if (can && m.status === "new") set.mutate({ id: m.id, status: "read" }, { onSuccess: () => setSel((c) => (c?.id === m.id ? { ...c, status: "read" } : c)) }); }}
        columns={[{ key: "n", header: "De", cell: (m) => <div><p className={m.status === "new" ? "font-semibold" : ""}>{m.name}</p><p className="text-xs text-muted">{m.email}</p></div> }, { key: "s", header: "Asunto", cell: (m) => m.subject ?? <span className="text-muted">(sin asunto)</span> }, { key: "e", header: "Estado", cell: (m) => <Status s={m.status} /> }, { key: "d", header: "Fecha", cell: (m) => <DateTime value={m.createdAt} /> }]} />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.subject ?? "Mensaje de contacto"}
        footer={sel && can ? <>{(["read", "replied", "spam"] as const).map((s) => <Button key={s} size="sm" disabled={sel.status === s || set.isPending} onClick={() => change(sel, s)}>{s === "read" ? "Marcar leído" : s === "replied" ? "Respondido" : "Marcar spam"}</Button>)}
          <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} loading={del.isPending} onClick={async () => { if (await confirm({ title: "Eliminar mensaje", message: "Se eliminará de forma definitiva.", danger: true, confirmLabel: "Eliminar" })) del.mutate(sel.id, { onSuccess: () => setSel(null) }); }}>Eliminar</Button></> : undefined}>
        {sel && <div className="space-y-3 text-sm"><p><b>{sel.name}</b> · <a href={`mailto:${encodeURIComponent(sel.email)}`} className="text-accent-text underline">{sel.email}</a></p><p className="text-xs text-muted"><DateTime value={sel.createdAt} /></p><Status s={sel.status} /><p className="whitespace-pre-wrap rounded-sm bg-surface2 p-3">{sel.body}</p></div>}
      </Drawer>
    </>
  );
}
