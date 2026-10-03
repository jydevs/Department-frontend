"use client";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, Money, PageHeader } from "@/components/admin/ui/Display";
import { SearchInput, Select } from "@/components/admin/ui/Form";
import { useToast } from "@/components/admin/ui/Toast";
import { downloadCsv, useCustomerTags, useCustomers, type CustomerFilters } from "@/lib/admin/api/admin";
import { useCan } from "@/lib/admin/permissions";
import { db } from "@/lib/admin/mock/db";

export default function CustomersPage() {
  const router = useRouter(), toast = useToast(), can = useCan("customers:read");
  const [f, setF] = useState<CustomerFilters>({ q: "", tag: "", marketing: "", page: 1 });
  const set = (p: Partial<CustomerFilters>) => setF((x) => ({ ...x, page: 1, ...p }));
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const { data, isLoading } = useCustomers(f);
  const tags = useCustomerTags().data ?? [];
  const exportCsv = () => { downloadCsv("clientes.csv", [["id", "nombre", "correo", "teléfono", "pedidos", "total_gastado", "marketing"], ...db().customers.map((c) => [c.id, c.name, c.email, c.phone, c.ordersCount, c.totalSpent, c.marketing])]); toast.success("CSV exportado"); };
  return (
    <>
      <PageHeader title="Clientes" actions={can ? <Button icon={<Download className="size-4" />} onClick={exportCsv}>Exportar CSV</Button> : undefined} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3"><SearchInput onSearch={onSearch} placeholder="Nombre o correo" />
        <Select aria-label="Etiqueta" value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">Etiqueta: todas</option>{tags.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select aria-label="Marketing" value={f.marketing} onChange={(e) => set({ marketing: e.target.value })}><option value="">Marketing: todos</option><option value="true">Acepta marketing</option><option value="false">No acepta</option></Select></div>
      <DataTable caption="Clientes" loading={isLoading} rows={data?.items} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "n", header: "Cliente", sortValue: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.email}</p></div> },
          { key: "t", header: "Etiquetas", cell: (c) => <div className="flex gap-1">{c.anonymized && <Badge tone="danger">Anonimizado</Badge>}{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          { key: "o", header: "Pedidos", sortValue: (c) => c.ordersCount, cell: (c) => c.ordersCount },
          { key: "s", header: "Gastado", sortValue: (c) => c.totalSpent, cell: (c) => <Money value={c.totalSpent} /> },
          { key: "d", header: "Alta", cell: (c) => <DateTime value={c.createdAt} /> },
        ]} />
    </>
  );
}
