"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Badge, DateTime, Money, PageHeader, StatusBadge } from "@/components/admin/ui/Display";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Input, SearchInput, Select } from "@/components/admin/ui/Form";
import { errorMessage } from "@/lib/admin/errors";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatus";
import { REFUND_PENDING_TAG, emptyOrderFilters, useOrders, type OrderFilters } from "@/lib/admin/api/orders";

export default function OrdersPage() {
  const router = useRouter();
  const [f, setF] = useState<OrderFilters>(emptyOrderFilters);
  const set = (p: Partial<OrderFilters>) => setF((x) => ({ ...x, page: 1, ...p }));
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const { data, isLoading, error } = useOrders(f);
  const onTag = useCallback((tag: string) => setF((x) => (x.tag === tag ? x : { ...x, tag, page: 1 })), []);
  return (
    <>
      <PageHeader title="Pedidos" />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-8">
        <SearchInput onSearch={onSearch} placeholder="Número, nombre o correo" className="lg:col-span-2" />
        <Select aria-label="Estado del pedido" value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Pedido: todos</option><option value="pending">Por pagar</option><option value="open">Abierto</option><option value="completed">Completado</option><option value="cancelled">Cancelado</option><option value="expired">Expirado</option>
        </Select>
        <Select aria-label="Estado de pago" value={f.financial} onChange={(e) => set({ financial: e.target.value })}>
          <option value="">Pago: todos</option><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="failed">Fallido</option><option value="refund-pending">Reembolso pendiente</option><option value="partially-refunded">Reembolso parcial</option><option value="refunded">Reembolsado</option>
        </Select>
        <Select aria-label="Estado de envío" value={f.fulfillment} onChange={(e) => set({ fulfillment: e.target.value })}>
          <option value="">Envío: todos</option><option value="unfulfilled">Sin enviar</option><option value="partial">Parcial</option><option value="fulfilled">Enviado</option>
        </Select>
        <SearchInput onSearch={onTag} placeholder="Etiqueta" />
        <div className="flex gap-2 lg:col-span-1 sm:col-span-2"><Input aria-label="Desde" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} /><Input aria-label="Hasta" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </div>
      <DataTable caption="Lista de pedidos" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "n", header: "Pedido", cell: (o) => <span className="font-medium">#{o.number}</span> },
          { key: "d", header: "Fecha", cell: (o) => <DateTime value={o.createdAt} /> },
          { key: "c", header: "Cliente", cell: (o) => <div><p>{o.customer.name}</p><p className="text-xs text-muted">{o.customer.email}</p></div> },
          { key: "s", header: "Estado", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { key: "p", header: "Pago", cell: (o) => <StatusBadge status={o.financial} /> },
          { key: "e", header: "Envío", cell: (o) => <StatusBadge status={o.fulfillment} /> },
          { key: "t", header: "Etiquetas", cell: (o) => <div className="flex gap-1">{o.tags.filter((t) => t !== REFUND_PENDING_TAG).map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          { key: "m", header: "Total", align: "right", cell: (o) => <Money value={o.total} /> },
        ]} />
    </>
  );
}
