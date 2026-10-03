"use client";
import { useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { DateTime, PageHeader, StatusBadge } from "@/components/ui/Display";
import { Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { useMessages, useSetMessageStatus } from "@/lib/api/admin";
import { useCan } from "@/lib/permissions";
import type { ContactMessage } from "@/lib/types";

export default function MessagesPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useMessages(status);
  const set = useSetMessageStatus(), can = useCan("marketing:write");
  const [sel, setSel] = useState<ContactMessage | null>(null);
  const change = (m: ContactMessage, s: ContactMessage["status"]) => set.mutate({ id: m.id, status: s }, { onSuccess: () => setSel({ ...m, status: s }) });
  return (
    <>
      <PageHeader title="Mensajes de contacto" actions={<Select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44"><option value="">Todos</option><option value="new">Nuevos</option><option value="read">Leídos</option><option value="replied">Respondidos</option><option value="archived">Archivados</option></Select>} />
      <DataTable caption="Mensajes de contacto" loading={isLoading} rows={data} rowKey={(m) => m.id} onRowClick={(m) => { setSel(m); if (can && m.status === "new") set.mutate({ id: m.id, status: "read" }); }}
        columns={[{ key: "n", header: "De", cell: (m) => <div><p className={m.status === "new" ? "font-semibold" : ""}>{m.name}</p><p className="text-xs text-muted">{m.email}</p></div> }, { key: "s", header: "Asunto", cell: (m) => m.subject }, { key: "e", header: "Estado", cell: (m) => <StatusBadge status={m.status} /> }, { key: "d", header: "Fecha", sortValue: (m) => m.createdAt, cell: (m) => <DateTime value={m.createdAt} /> }]} />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.subject ?? ""}
        footer={sel && can ? <>{(["read", "replied", "archived"] as const).map((s) => <Button key={s} size="sm" disabled={sel.status === s} onClick={() => change(sel, s)}>{s === "read" ? "Marcar leído" : s === "replied" ? "Respondido" : "Archivar"}</Button>)}</> : undefined}>
        {sel && <div className="space-y-3 text-sm"><p><b>{sel.name}</b> · <a href={`mailto:${encodeURIComponent(sel.email)}`} className="text-accent underline">{sel.email}</a></p><p className="text-xs text-muted"><DateTime value={sel.createdAt} /></p><StatusBadge status={sel.status} /><p className="whitespace-pre-wrap rounded-lg bg-surface2 p-3">{sel.body}</p></div>}
      </Drawer>
    </>
  );
}
