"use client";

import { Link } from "@/lib/admin/navigation";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Boxes, CheckCircle2, Minus, PackageOpen, ReceiptText, ShoppingBag, TriangleAlert } from "lucide-react";
import { Card, DateTime, EmptyState, ErrorState, LinkButton, Money, PageHeader, Select, Skeleton } from "@/components/admin/ui";
import { useAuth } from "@/lib/admin/auth";
import { useCan } from "@/lib/admin/permissions";
import { cn } from "@/lib/admin/utils";
import { formatNumber } from "@/lib/admin/format";
import {
  PERIOD_OPTIONS,
  useCustomerStats,
  useLowStock,
  useOrderAlerts,
  useOverview,
  useRecentOrders,
  useSales,
  useTopProducts,
  type GroupBy,
  type OverviewChange,
  type PeriodDays,
} from "@/lib/admin/api/dashboard";
import { FulfillmentBadge, OrderStatusBadge, PaymentBadge } from "@/components/admin/orders/badges";
import type { OrderSummary } from "@/lib/admin/api/orders";
import { formatChange, formatPercent } from "./format";
import { SalesChart } from "./sales-chart";

/* ---------------- KPI ---------------- */

function Delta({ value, previousLabel }: { value: number | null | undefined; previousLabel: ReactNode }) {
  if (value === null || value === undefined) {
    return <p className="mt-1 text-xs text-muted">Sin datos del periodo anterior</p>;
  }
  const up = value > 0;
  const down = value < 0;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", up && "text-success", down && "text-danger")}>
        <Icon aria-hidden size={12} />
        <span className="sr-only">{up ? "Aumento de " : down ? "Descenso de " : "Sin cambio: "}</span>
        {formatChange(value)}
      </span>
      <span>vs. {previousLabel}</span>
    </p>
  );
}

function Kpi({ label, value, change, previous }: { label: string; value: ReactNode; change: number | null | undefined; previous: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <Delta value={change} previousLabel={previous} />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-36" />
    </div>
  );
}

function KpiGrid({ days }: { days: number }) {
  const q = useOverview(days);
  if (q.error) return <Card><ErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>;
  if (!q.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }
  const { current: c, previous: p, change } = q.data;
  const ch: OverviewChange = change;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-busy={q.isFetching || undefined}>
      <Kpi label="Ventas netas" value={<Money value={c.netSales} />} change={ch.netSales} previous={<Money value={p.netSales} />} />
      <Kpi label="Pedidos pagados" value={formatNumber(c.paidOrders)} change={ch.paidOrders} previous={formatNumber(p.paidOrders)} />
      <Kpi label="Ticket promedio" value={<Money value={c.averageOrderValue} />} change={ch.averageOrderValue} previous={<Money value={p.averageOrderValue} />} />
      <Kpi label="Clientes nuevos" value={formatNumber(c.newCustomers)} change={ch.newCustomers} previous={formatNumber(p.newCustomers)} />
      <Kpi label="Pedidos que se pagan" value={formatPercent(c.paidRate)} change={ch.paidRate} previous={formatPercent(p.paidRate)} />
    </div>
  );
}

/* ---------------- Gráfica de ventas ---------------- */

function SalesCard({ days }: { days: number }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const q = useSales(days, groupBy);
  return (
    <Card
      title="Ventas"
      description={`Últimos ${days} días`}
      actions={
        <Select aria-label="Agrupar ventas por" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="h-8 py-0 text-[13px]">
          <option value="day">Por día</option>
          <option value="week">Por semana</option>
          <option value="month">Por mes</option>
        </Select>
      }
    >
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-[280px] w-full" />
      ) : (
        <SalesChart buckets={q.data.buckets} groupBy={q.data.groupBy} />
      )}
    </Card>
  );
}

/* ---------------- Top productos ---------------- */

function TopProductsCard({ days }: { days: number }) {
  const [sortBy, setSortBy] = useState<"revenue" | "units">("revenue");
  const q = useTopProducts(days, sortBy);
  const items = q.data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => (sortBy === "revenue" ? i.revenue : i.units)));
  return (
    <Card
      title="Productos más vendidos"
      actions={
        <Select aria-label="Ordenar productos por" value={sortBy} onChange={(e) => setSortBy(e.target.value as "revenue" | "units")} className="h-8 py-0 text-[13px]">
          <option value="revenue">Por ingresos</option>
          <option value="units">Por unidades</option>
        </Select>
      }
    >
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="py-8" icon={<PackageOpen aria-hidden size={20} />} title="Sin ventas en el periodo" />
      ) : (
        <ol className="space-y-3">
          {items.map((p, i) => {
            const v = sortBy === "revenue" ? p.revenue : p.units;
            return (
              <li key={p.productId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
                    {p.title}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{sortBy === "revenue" ? <Money value={p.revenue} /> : `${formatNumber(p.units)} ${p.units === 1 ? "ud." : "uds."}`}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <div className="h-full rounded-full bg-info" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatNumber(p.units)} {p.units === 1 ? "ud." : "uds."} · {formatNumber(p.orders)} {p.orders === 1 ? "pedido" : "pedidos"}
                  {sortBy === "units" ? (
                    <>
                      {" "}
                      · <Money value={p.revenue} />
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ---------------- Clientes ---------------- */

function CustomersCard({ days }: { days: number }) {
  const q = useCustomerStats(days);
  const d = q.data;
  const firstTime = d ? Math.max(0, d.buyers - d.repeatBuyers) : 0;
  const share = d && d.buyers > 0 ? d.repeatBuyers / d.buyers : 0;
  return (
    <Card title="Clientes" description={`Últimos ${days} días`}>
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !d ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Clientes nuevos" value={formatNumber(d.newCustomers)} hint="cuentas creadas" />
            <Stat label="Clientes recurrentes" value={formatNumber(d.repeatBuyers)} hint="2+ pedidos pagados" />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span className="text-muted">Compradores del periodo</span>
              <span className="font-medium tabular-nums">{formatNumber(d.buyers)}</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${formatNumber(firstTime)} compradores de una sola compra y ${formatNumber(d.repeatBuyers)} recurrentes`}>
              {d.buyers > 0 ? (
                <>
                  <div className="h-full bg-info" style={{ width: `${(1 - share) * 100}%` }} />
                  <div className="h-full bg-success" style={{ width: `${share * 100}%` }} />
                </>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-info" />
                Una compra: {formatNumber(firstTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-success" />
                Recurrentes: {formatNumber(d.repeatBuyers)}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Total de clientes</dt>
              <dd className="font-medium tabular-nums">{formatNumber(d.totalCustomers)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Pedidos de invitados</dt>
              <dd className="font-medium tabular-nums">{formatNumber(d.guestOrders)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Suscritos a marketing</dt>
              <dd className="font-medium tabular-nums">{formatNumber(d.marketingSubscribers)}</dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/* ---------------- Pedidos recientes ---------------- */

function OrderRow({ o }: { o: OrderSummary }) {
  return (
    <li>
      <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3 hover:bg-surface-2 focus-visible:bg-surface-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            #{o.orderNumber} <span className="font-normal text-muted">· {o.customerName ?? o.email}</span>
          </p>
          <p className="text-xs text-muted">
            <DateTime value={o.createdAt} mode="relative" /> · {formatNumber(o.itemCount)} {o.itemCount === 1 ? "artículo" : "artículos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <OrderStatusBadge status={o.status} />
          <PaymentBadge status={o.paymentStatus} />
          <FulfillmentBadge status={o.fulfillmentStatus} orderStatus={o.status} />
          <Money value={o.total} className="ml-1 w-24 text-right text-sm font-medium" />
        </div>
      </Link>
    </li>
  );
}

function RecentOrdersCard() {
  const q = useRecentOrders();
  return (
    <Card
      title="Pedidos recientes"
      flush
      actions={
        <LinkButton href="/orders" size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden size={13} />}>
          Ver todos
        </LinkButton>
      }
    >
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : q.data.items.length === 0 ? (
        <EmptyState className="py-8" icon={<ShoppingBag aria-hidden size={20} />} title="Aún no hay pedidos" description="Los pedidos nuevos aparecerán aquí." />
      ) : (
        <ul className="divide-y divide-border">
          {q.data.items.map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Alertas ---------------- */

function AlertCard({
  icon,
  title,
  count,
  loading,
  error,
  href,
  hrefLabel,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number | undefined;
  loading: boolean;
  error: unknown;
  href: string;
  hrefLabel: string;
  tone: "warning" | "info";
  children?: ReactNode;
}) {
  const hasItems = (count ?? 0) > 0;
  return (
    <section aria-label={title} className={cn("rounded-lg border bg-surface p-4 shadow-sm", hasItems ? (tone === "warning" ? "border-warning/50" : "border-info/40") : "border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", hasItems ? (tone === "warning" ? "bg-warning/15 text-warning" : "bg-info/15 text-info") : "bg-success/15 text-success")}>
            {hasItems ? icon : <CheckCircle2 aria-hidden size={18} />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm">{title}</h3>
            <p className="text-xs text-muted">{loading ? "Cargando…" : error ? "No se pudo cargar" : hasItems ? `${formatNumber(count ?? 0)} por revisar` : "Todo en orden"}</p>
          </div>
        </div>
        {hasItems ? (
          <Link href={href} className="shrink-0 text-xs font-medium text-accent-text hover:underline">
            {hrefLabel}
          </Link>
        ) : null}
      </div>
      {hasItems ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function OrderMiniList({ items }: { items: OrderSummary[] }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {items.slice(0, 3).map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px] hover:bg-surface-2">
            <span className="min-w-0 truncate">
              <span className="font-medium">#{o.orderNumber}</span> <span className="text-muted">· {o.customerName ?? o.email}</span>
            </span>
            <Money value={o.total} className="shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AlertsRow({ canOrders, canInventory }: { canOrders: boolean; canInventory: boolean }) {
  const refund = useOrderAlerts("refund-pending", canOrders);
  const unfulfilled = useOrderAlerts("unfulfilled", canOrders);
  const stock = useLowStock(canInventory);
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {canOrders ? (
        <>
          <AlertCard
            icon={<ReceiptText aria-hidden size={18} />}
            title="Reembolsos pendientes"
            count={refund.data?.total}
            loading={refund.isLoading}
            error={refund.error}
            href="/orders?tag=refund-pending"
            hrefLabel="Ver pedidos"
            tone="warning"
          >
            <p className="mb-2 text-xs text-muted">Hay que devolver el dinero en Wompi y registrar el reembolso.</p>
            <OrderMiniList items={refund.data?.items ?? []} />
          </AlertCard>
          <AlertCard
            icon={<PackageOpen aria-hidden size={18} />}
            title="Pagados sin enviar"
            count={unfulfilled.data?.total}
            loading={unfulfilled.isLoading}
            error={unfulfilled.error}
            href="/orders?status=open&paymentStatus=paid&fulfillmentStatus=unfulfilled"
            hrefLabel="Ver pedidos"
            tone="info"
          >
            <OrderMiniList items={unfulfilled.data?.items ?? []} />
          </AlertCard>
        </>
      ) : null}
      {canInventory ? (
        <AlertCard
          icon={<Boxes aria-hidden size={18} />}
          title="Stock bajo"
          count={stock.data?.total}
          loading={stock.isLoading}
          error={stock.error}
          href="/inventory"
          hrefLabel="Ver inventario"
          tone="warning"
        >
          <ul className="divide-y divide-border rounded-md border border-border">
            {(stock.data?.items ?? []).slice(0, 3).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate">
                  {l.productTitle ?? l.variantSku ?? l.variantTitle} <span className="text-muted">· {l.locationName}</span>
                </span>
                <span className={cn("shrink-0 font-medium tabular-nums", l.onHand - l.reserved <= 0 ? "text-danger" : "text-warning")}>{formatNumber(l.onHand - l.reserved)} disp.</span>
              </li>
            ))}
          </ul>
        </AlertCard>
      ) : null}
    </div>
  );
}

/* ---------------- Página ---------------- */

export function Dashboard() {
  const { user } = useAuth();
  const canAnalytics = useCan("analytics:read");
  const canOrders = useCan("orders:read");
  const canInventory = useCan("inventory:read");
  const canProducts = useCan("products:read");
  const canCustomers = useCan("customers:read");
  const [days, setDays] = useState<PeriodDays>(30);
  const firstName = (user?.fullName || user?.email || "").split(/[ @]/)[0];

  const nothing = !canAnalytics && !canOrders && !canInventory;

  return (
    <>
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : "Inicio"}
        description="Resumen de la tienda: ventas, pedidos y lo que necesita tu atención."
        actions={
          canAnalytics ? (
            <div role="group" aria-label="Periodo" className="inline-flex rounded-md border border-border-strong bg-surface-2 p-0.5">
              {PERIOD_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={cn("h-8 rounded px-3 text-[13px] font-medium transition-colors", days === d ? "bg-accent text-accent-contrast" : "text-muted hover:text-text")}
                >
                  {d} días
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {nothing ? (
        <Card>
          <EmptyState
            icon={<TriangleAlert aria-hidden size={22} />}
            title="Tu rol no incluye paneles de resumen"
            description="Usa el menú lateral para acceder a las secciones que sí tienes habilitadas."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {canOrders || canInventory ? <AlertsRow canOrders={canOrders} canInventory={canInventory} /> : null}
          {canAnalytics ? (
            <>
              <KpiGrid days={days} />
              <SalesCard days={days} />
              <div className="grid gap-6 lg:grid-cols-2">
                <TopProductsCard days={days} />
                <CustomersCard days={days} />
              </div>
            </>
          ) : null}
          {canOrders ? <RecentOrdersCard /> : null}
          <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-2">
            {canOrders ? (
              <LinkButton href="/orders" size="sm">
                Pedidos
              </LinkButton>
            ) : null}
            {canProducts ? (
              <LinkButton href="/products/new" size="sm">
                Añadir producto
              </LinkButton>
            ) : null}
            {canCustomers ? (
              <LinkButton href="/customers" size="sm">
                Clientes
              </LinkButton>
            ) : null}
            {canInventory ? (
              <LinkButton href="/inventory" size="sm">
                Inventario
              </LinkButton>
            ) : null}
          </nav>
        </div>
      )}
    </>
  );
}
