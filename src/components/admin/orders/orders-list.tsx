"use client";

import { Link } from "@/lib/admin/navigation";
import { usePathname, useRouter } from "@/lib/admin/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { FilterX, ShoppingBag } from "lucide-react";
import { Button, DataTable, DateTime, EmptyState, Input, Money, NoAccess, PageHeader, SearchInput, Select, type DataTableColumn } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { formatNumber } from "@/lib/admin/format";
import { useOrders, type OrderListParams, type OrderSummary } from "@/lib/admin/api/orders";
import { FULFILLMENT_STATUS_OPTIONS, FulfillmentBadge, ORDER_STATUS_OPTIONS, OrderStatusBadge, OrderTag, PAYMENT_STATUS_OPTIONS, PaymentBadge } from "./badges";

const PAGE_SIZES = [10, 25, 50, 100];
const FILTER_KEYS = ["q", "status", "paymentStatus", "fulfillmentStatus", "tag", "from", "to"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Fechas de los filtros: `YYYY-MM-DD` interpretadas en hora de Bogotá (UTC-5). */
function dayStart(d: string): string {
  return `${d}T00:00:00-05:00`;
}
function dayEnd(d: string): string {
  return `${d}T23:59:59.999-05:00`;
}

export function OrdersList() {
  const canRead = useCan("orders:read");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const filters = useMemo(() => {
    const f = {} as Record<FilterKey, string>;
    for (const k of FILTER_KEYS) f[k] = search.get(k) ?? "";
    return f;
  }, [search]);
  const page = Math.max(1, Number(search.get("page")) || 1);
  const pageSize = PAGE_SIZES.includes(Number(search.get("pageSize"))) ? Number(search.get("pageSize")) : 25;

  const update = useCallback(
    (patch: Partial<Record<FilterKey | "page" | "pageSize", string>>) => {
      const next = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      // cualquier cambio de filtro vuelve a la página 1
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, search],
  );

  const params: OrderListParams = {
    page,
    pageSize,
    q: filters.q || undefined,
    status: filters.status || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    fulfillmentStatus: filters.fulfillmentStatus || undefined,
    tag: filters.tag || undefined,
    from: filters.from ? dayStart(filters.from) : undefined,
    to: filters.to ? dayEnd(filters.to) : undefined,
  };
  const dateInvalid = !!filters.from && !!filters.to && filters.from > filters.to;
  const query = useOrders(dateInvalid ? { ...params, from: undefined, to: undefined } : params, { enabled: canRead });
  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  const columns: DataTableColumn<OrderSummary>[] = [
    {
      key: "number",
      header: "Pedido",
      width: "80px",
      cell: (o) => (
        <Link href={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-text hover:text-accent-text hover:underline">
          #{o.orderNumber}
        </Link>
      ),
    },
    { key: "date", header: "Fecha", hideOnMobile: true, width: "120px", cell: (o) => <DateTime value={o.createdAt} mode="relative" className="text-muted" /> },
    {
      key: "customer",
      header: "Cliente",
      cell: (o) => (
        <div className="min-w-0 max-w-[8.5rem] sm:max-w-none">
          <div className="truncate font-medium">{o.customerName ?? "—"}</div>
          <div className="truncate text-xs text-muted">{o.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
            <OrderStatusBadge status={o.status} />
            <DateTime value={o.createdAt} mode="relative" className="text-xs text-muted" />
          </div>
          {o.tags.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {o.tags.slice(0, 3).map((t) => (
                <OrderTag key={t} tag={t} />
              ))}
              {o.tags.length > 3 ? <span className="text-xs text-muted">+{o.tags.length - 3}</span> : null}
            </div>
          ) : null}
        </div>
      ),
    },
    { key: "items", header: "Artículos", align: "right", hideOnMobile: true, cell: (o) => <span className="tabular-nums">{formatNumber(o.itemCount)}</span> },
    { key: "total", header: "Total", align: "right", cell: (o) => <Money value={o.total} className="font-medium" /> },
    { key: "status", header: "Estado", hideOnMobile: true, cell: (o) => <OrderStatusBadge status={o.status} /> },
    { key: "payment", header: "Pago", hideOnMobile: true, cell: (o) => <PaymentBadge status={o.paymentStatus} /> },
    { key: "fulfillment", header: "Envío", hideOnMobile: true, cell: (o) => <FulfillmentBadge status={o.fulfillmentStatus} orderStatus={o.status} /> },
  ];

  if (!canRead) return <NoAccess permission="orders:read" />;

  return (
    <>
      <PageHeader title="Pedidos" description="Pagos, envíos y reembolsos de la tienda." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <SearchInput
          className="sm:col-span-2 lg:col-span-4"
          label="Buscar pedidos"
          placeholder="Buscar por n.º (#1001), correo o nombre…"
          value={filters.q}
          onChange={(v) => update({ q: v })}
        />
        <Select aria-label="Estado del pedido" wrapperClassName="lg:col-span-2" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Estado: todos</option>
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Estado del pago" wrapperClassName="lg:col-span-3" value={filters.paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value })}>
          <option value="">Pago: todos</option>
          {PAYMENT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Estado del envío" wrapperClassName="lg:col-span-3" value={filters.fulfillmentStatus} onChange={(e) => update({ fulfillmentStatus: e.target.value })}>
          <option value="">Envío: todos</option>
          {FULFILLMENT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-1 lg:col-span-3">
          <SearchInput label="Filtrar por etiqueta" placeholder="Etiqueta (p. ej. refund-pending)" value={filters.tag} onChange={(v) => update({ tag: v.trim() })} />
        </div>
        <Input aria-label="Desde" type="date" max={filters.to || undefined} wrapperClassName="lg:col-span-2" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
        <Input
          aria-label="Hasta"
          type="date"
          min={filters.from || undefined}
          wrapperClassName="lg:col-span-2"
          value={filters.to}
          error={dateInvalid ? "La fecha final es anterior a la inicial" : undefined}
          onChange={(e) => update({ to: e.target.value })}
        />
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
          {hasFilters ? (
            <Button variant="ghost" size="sm" leftIcon={<FilterX aria-hidden size={14} />} onClick={() => router.replace(pathname, { scroll: false })}>
              Limpiar filtros
            </Button>
          ) : null}
          {query.data ? (
            <p className="text-[13px] text-muted" aria-live="polite">
              {formatNumber(query.data.total)} {query.data.total === 1 ? "pedido" : "pedidos"}
            </p>
          ) : null}
        </div>
      </div>

      <DataTable
        aria-label="Lista de pedidos"
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(o) => o.id}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        loading={query.isLoading || query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={
          <EmptyState
            icon={<ShoppingBag aria-hidden size={22} />}
            title={hasFilters ? "Ningún pedido coincide con los filtros" : "Aún no hay pedidos"}
            description={hasFilters ? "Prueba con otros criterios o limpia los filtros." : "Cuando un cliente complete una compra, aparecerá aquí."}
            action={
              hasFilters ? (
                <Button size="sm" onClick={() => router.replace(pathname, { scroll: false })}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        }
        pagination={{
          page,
          pageSize,
          total: query.data?.total ?? 0,
          pageSizes: PAGE_SIZES,
          onPageChange: (p) => update({ page: p > 1 ? String(p) : "" }),
          onPageSizeChange: (s) => update({ pageSize: s === 25 ? "" : String(s), page: "" }),
        }}
      />
    </>
  );
}
