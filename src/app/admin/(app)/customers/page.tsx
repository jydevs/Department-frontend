"use client";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/admin/ui/Display";
import { SearchInput, Select } from "@/components/admin/ui/Form";
import { useToast } from "@/components/admin/ui/Toast";
import { exportCustomers, useCustomers, type CustomerFilters } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";

export default function CustomersPage() {
  const router = useRouter(), toast = useToast(), canExport = useCan("customers:write");
  const [f, setF] = useState<CustomerFilters>({ q: "", tag: "", marketing: "", active: "", page: 1 });
  const [exporting, setExporting] = useState(false);
  const set = (p: Partial<CustomerFilters>) => setF((x) => ({ ...x, page: 1, ...p }));
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const onTag = useCallback((tag: string) => setF((x) => (x.tag === tag ? x : { ...x, tag, page: 1 })), []);
  const { data, isLoading, error } = useCustomers(f);
  const exportCsv = async () => {
    setExporting(true);
    try { await exportCustomers(f); toast.success("CSV exportado (clientes no anonimizados, con los filtros actuales)"); } catch (e) { toast.error(errorMessage(e)); } finally { setExporting(false); }
  };
  return (
    <>
      <PageHeader title="Clientes" actions={canExport ? <Button icon={<Download className="size-4" />} loading={exporting} onClick={exportCsv}>Exportar CSV</Button> : undefined} />
      <div className="mb-3 grid gap-2 sm:grid-cols-4"><SearchInput onSearch={onSearch} placeholder="Nombre o correo" />
        <SearchInput onSearch={onTag} placeholder="Etiqueta exacta" />
        <Select aria-label="Marketing" value={f.marketing} onChange={(e) => set({ marketing: e.target.value })}><option value="">Marketing: todos</option><option value="true">Acepta marketing</option><option value="false">No acepta</option></Select>
        <Select aria-label="Estado" value={f.active} onChange={(e) => set({ active: e.target.value })}><option value="">Estado: todos</option><option value="true">Activos</option><option value="false">Desactivados</option></Select></div>
      <DataTable caption="Clientes" loading={isLoading} rows={data?.items} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
        error={error ? errorMessage(error) : undefined}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "n", header: "Cliente", cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.email}</p></div> },
          { key: "t", header: "Etiquetas", cell: (c) => <div className="flex flex-wrap gap-1">{c.anonymized && <Badge tone="danger">Anonimizado</Badge>}{!c.isActive && !c.anonymized && <Badge tone="warn">Desactivado</Badge>}{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          { key: "m", header: "Marketing", cell: (c) => (c.marketing ? "Sí" : "No") },
          { key: "a", header: "Cuenta", cell: (c) => (c.hasAccount ? "Registrado" : "Invitado") },
          { key: "d", header: "Alta", cell: (c) => <DateTime value={c.createdAt} /> },
        ]} />
    </>
  );
}
