"use client";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { DateTime, PageHeader, StatusBadge } from "@/components/ui/Display";
import { SearchInput, Select } from "@/components/ui/Form";
import { useConfirm } from "@/components/ui/Overlay";
import { downloadCsv, useSubscribers, useUnsubscribe } from "@/lib/api/admin";
import { useCan } from "@/lib/permissions";

export default function NewsletterPage() {
  const [status, setStatus] = useState(""), [q, setQ] = useState("");
  const onSearch = useCallback((v: string) => setQ(v), []);
  const { data, isLoading } = useSubscribers(status, q);
  const un = useUnsubscribe(), confirm = useConfirm();
  const can = useCan("marketing:write");
  return (
    <>
      <PageHeader title="Newsletter" actions={<Button icon={<Download className="size-4" />} disabled={!data?.length} onClick={() => data && downloadCsv("suscriptores.csv", [["correo", "estado", "origen", "alta"], ...data.map((s) => [s.email, s.status, s.source, s.createdAt])])}>Exportar CSV</Button>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3"><SearchInput onSearch={onSearch} placeholder="Buscar correo" className="sm:col-span-2" /><Select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="subscribed">Suscritos</option><option value="unsubscribed">Dados de baja</option></Select></div>
      <DataTable caption="Suscriptores" loading={isLoading} rows={data} rowKey={(s) => s.id}
        columns={[{ key: "e", header: "Correo", sortValue: (s) => s.email, cell: (s) => s.email }, { key: "s", header: "Estado", cell: (s) => <StatusBadge status={s.status} /> }, { key: "o", header: "Origen", cell: (s) => s.source }, { key: "d", header: "Alta", sortValue: (s) => s.createdAt, cell: (s) => <DateTime value={s.createdAt} /> },
          { key: "a", header: "", align: "right", cell: (s) => can && s.status === "subscribed" ? <Button size="sm" onClick={async () => { if (await confirm({ title: "Dar de baja", message: `${s.email} dejará de recibir correos.`, confirmLabel: "Dar de baja" })) un.mutate(s.id); }}>Dar de baja</Button> : null }]} />
    </>
  );
}
