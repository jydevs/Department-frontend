"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Badge, DateTime, Money, PageHeader, StatusBadge } from "@/components/admin/ui/Display";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Input, SearchInput, Select } from "@/components/admin/ui/Form";
import { errorMessage } from "@/lib/admin/errors";
import { useAllOrderTags, useOrders, type OrderFilters } from "@/lib/admin/api/orders";

export default function OrdersPage() {
  const router = useRouter();
  const [f, setF] = useState<OrderFilters>({ q: "", financial: "", fulfillment: "", tag: "", from: "", to: "", page: 1 });
  const set = (p: Partial<OrderFilters>) => setF((x) => ({ ...x, page: 1, ...p }));
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const { data, isLoading, error } = useOrders(f);
  const tags = useAllOrderTags().data ?? [];
  return (
    <>
      <PageHeader title="Pedidos" />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        <SearchInput onSearch={onSearch} placeholder="Número, cliente o correo" className="lg:col-span-2" />
        <Select aria-label="Estado de pago" value={f.financial} onChange={(e) => set({ financial: e.target.value })}>
          <option value="">Pago: todos</option><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="refund-pending">Reembolso pendiente</option><option value="partially-refunded">Reembolso parcial</option><option value="refunded">Reembolsado</option>
        </Select>
        <Select aria-label="Estado de envío" value={f.fulfillment} onChange={(e) => set({ fulfillment: e.target.value })}>
          <option value="">Envío: todos</option><option value="unfulfilled">Sin enviar</option><option value="partial">Parcial</option><option value="fulfilled">Enviado</option><option value="cancelled">Cancelado</option>
        </Select>
        <Select aria-label="Etiqueta" value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">Etiqueta: todas</option>{tags.map((t) => <option key={t}>{t}</option>)}</Select>
        <div className="flex gap-2 lg:col-span-2"><Input aria-label="Desde" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} /><Input aria-label="Hasta" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </div>
      <DataTable caption="Lista de pedidos" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "n", header: "Pedido", cell: (o) => <span className="font-medium">#{o.number}</span>, sortValue: (o) => o.number },
          { key: "d", header: "Fecha", cell: (o) => <DateTime value={o.createdAt} />, sortValue: (o) => o.createdAt },
          { key: "c", header: "Cliente", cell: (o) => <div><p>{o.customer.name}</p><p className="text-xs text-muted">{o.customer.email}</p></div> },
          { key: "p", header: "Pago", cell: (o) => <StatusBadge status={o.financial} /> },
          { key: "e", header: "Envío", cell: (o) => <StatusBadge status={o.fulfillment} /> },
          { key: "t", header: "Etiquetas", cell: (o) => <div className="flex gap-1">{o.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          { key: "m", header: "Total", align: "right", cell: (o) => <Money value={o.total} />, sortValue: (o) => o.total },
        ]} />
    </>
  );
}
