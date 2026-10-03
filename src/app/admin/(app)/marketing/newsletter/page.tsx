"use client";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/admin/ui/Display";
import { SearchInput, Select } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { exportSubscribers, useSubscribers, useUnsubscribe } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";

const STATUS = { subscribed: ["Suscrito", "ok"], pending: ["Pendiente de confirmar", "warn"], unsubscribed: ["Baja", "neutral"] } as const;
export default function NewsletterPage() {
  const [status, setStatus] = useState(""), [q, setQ] = useState(""), [page, setPage] = useState(1), [exporting, setExporting] = useState(false);
  const onSearch = useCallback((v: string) => { setQ(v); setPage(1); }, []);
  const { data, isLoading, error } = useSubscribers(status, q, page);
  const un = useUnsubscribe(), confirm = useConfirm(), toast = useToast();
  const can = useCan("marketing:write");
  const exportCsv = async () => { setExporting(true); try { await exportSubscribers(); toast.success("CSV exportado (solo suscritos confirmados)"); } catch (e) { toast.error(errorMessage(e)); } finally { setExporting(false); } };
  return (
    <>
      <PageHeader title="Newsletter" actions={can ? <Button icon={<Download className="size-4" />} loading={exporting} onClick={exportCsv}>Exportar CSV</Button> : undefined} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3"><SearchInput onSearch={onSearch} placeholder="Buscar correo" className="sm:col-span-2" /><Select aria-label="Estado" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option><option value="subscribed">Suscritos</option><option value="pending">Pendientes</option><option value="unsubscribed">Dados de baja</option></Select></div>
      <DataTable caption="Suscriptores" loading={isLoading} rows={data?.items} rowKey={(s) => s.id} error={error ? errorMessage(error) : undefined}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: setPage }}
        columns={[{ key: "e", header: "Correo", cell: (s) => s.email }, { key: "s", header: "Estado", cell: (s) => <Badge tone={STATUS[s.status]?.[1] ?? "neutral"}>{STATUS[s.status]?.[0] ?? s.status}</Badge> }, { key: "o", header: "Origen", cell: (s) => s.source }, { key: "d", header: "Alta", cell: (s) => <DateTime value={s.createdAt} /> },
          { key: "a", header: "", align: "right", cell: (s) => can && s.status !== "unsubscribed" ? <Button size="sm" onClick={async () => { if (await confirm({ title: "Dar de baja", message: `${s.email} dejará de recibir correos.`, confirmLabel: "Dar de baja" })) un.mutate(s.id); }}>Dar de baja</Button> : null }]} />
    </>
  );
}
