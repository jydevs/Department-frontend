"use client";
import { AlertTriangle, ArrowUpRight, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BarList, Delta, SalesChart } from "@/components/admin/dashboard/Charts";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { Select } from "@/components/admin/ui/Form";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatus";
import { emptyOrderFilters, useAlerts, useAnalytics, useOrders } from "@/lib/admin/api/orders";
import { errorMessage } from "@/lib/admin/errors";
import { useAuth } from "@/lib/admin/auth";
import { useCan } from "@/lib/admin/permissions";
import { Button } from "@/components/admin/ui/Button";
import { formatMoney, formatNumber } from "@/lib/admin/format";

/** Accesos rápidos: solo los que la persona puede abrir (`perm` es el permiso de lectura de la ruta destino). */
const QUICK = [
  { href: "/admin/products/new", label: "Nuevo producto", perm: "products:write" }, { href: "/admin/orders", label: "Ver pedidos", perm: "orders:read" },
  { href: "/admin/collections", label: "Colecciones", perm: "collections:read" }, { href: "/admin/imports", label: "Importar CSV", perm: "import:read" },
];

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const canAnalytics = useCan("analytics:read");
  const { data: a, error: aErr, refetch } = useAnalytics(days, canAnalytics);
  const alertsQ = useAlerts();
  const alerts = alertsQ.data;
  const canOrders = useCan("orders:read"), canStock = useCan("inventory:read");
  const { permissions } = useAuth();
  const quick = QUICK.filter((q) => permissions.includes(q.perm));
  const recentQ = useOrders(emptyOrderFilters, 5, canOrders);
  const recent = recentQ.data?.items;
  const kpis = a ? [
    { label: "Ventas netas", value: <Money value={a.netSales} />, d: <Delta pct={a.change.netSales} /> },
    { label: "Pedidos pagados", value: formatNumber(a.paidOrders), d: <Delta pct={a.change.paidOrders} /> },
    { label: "Ticket promedio", value: <Money value={a.aov} />, d: <Delta pct={a.change.averageOrderValue} /> },
    { label: "Clientes nuevos", value: formatNumber(a.newCustomers), d: <span className="adm-sub text-muted">{formatNumber(a.totalCustomers)} registrados</span> },
  ] : [];
  return (
    <>
      <PageHeader title="Inicio" description="Resumen del rendimiento de la tienda"
        actions={<Select aria-label="Periodo" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-44"><option value={7}>Últimos 7 días</option><option value={14}>Últimos 14 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option></Select>} />

      {aErr && !a && <div role="alert" className="mb-6 flex items-center justify-between gap-3 border border-line p-4 text-sm"><span>No se pudieron cargar las métricas: {errorMessage(aErr)}</span><Button size="sm" onClick={() => void refetch()}>Reintentar</Button></div>}
      {/* KPIs: fila con filetes finos; cada celda se invierte al pasar el cursor, como los valores de la home */}
      <section aria-label="Indicadores" className="mb-8 border-y border-line">
        <ul className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
          {a ? kpis.map((k, i) => (
            <li key={k.label}>
              <div className="adm-invert flex h-full min-h-40 flex-col justify-between px-5 py-6">
                <div className="flex items-start justify-between"><span className="adm-label">{k.label}</span><span className="adm-label">0{i + 1}</span></div>
                <div><p className="font-display text-display-md leading-none">{k.value}</p><p className="mt-2 text-xs">{k.d}</p></div>
              </div>
            </li>
          )) : Array.from({ length: 4 }, (_, i) => <li key={i} className="p-6"><Skeleton className="h-24" /></li>)}
        </ul>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card title="Ventas netas por día" className="lg:col-span-2">{a ? <SalesChart data={a.series} /> : <Skeleton className="h-56" />}</Card>
        <Card title="Top productos">{a ? (a.top.length ? <BarList items={a.top.map((t) => ({ label: t.title, value: t.revenue, sub: `${formatMoney(t.revenue)} · ${t.units} u.` }))} /> : <EmptyState title="Sin ventas en el periodo" />) : <Skeleton className="h-40" />}</Card>
      </div>

      {quick.length > 0 && <nav aria-label="Accesos rápidos" className="mb-8 grid grid-cols-2 border border-line lg:grid-cols-4">
        {quick.map((q, i) => (
          <Link key={q.href} href={q.href} className="adm-invert group flex items-center justify-between border-line px-5 py-4 [&:not(:last-child)]:border-r">
            <span className="font-condensed text-xs tracking-[0.16em]"><span className="adm-label mr-3">0{i + 1}</span>{q.label}</span>
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        ))}
      </nav>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Pedidos recientes" className={canOrders || canStock ? "lg:col-span-2" : "lg:col-span-3"} pad={false} actions={<Link href="/admin/orders" className="adm-label inline-block py-2 hover:text-fg">Ver todos →</Link>}>
          {!canOrders ? <EmptyState title="Sin permiso para ver pedidos" /> : recentQ.error && !recent ? <EmptyState title="No se pudieron cargar los pedidos" text={errorMessage(recentQ.error)} /> : !recent ? <div className="space-y-2 p-4"><Skeleton /><Skeleton /><Skeleton /></div> : recent.length === 0 ? <EmptyState title="Aún no hay pedidos" /> : (
            <ul>{recent.map((o) => (
              <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="adm-invert flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 last:border-0">
                <div><p className="font-condensed text-sm tracking-[0.1em]">#{o.number} · {o.customer.name}</p><p className="adm-sub text-xs text-muted"><DateTime value={o.createdAt} /></p></div>
                <div className="flex items-center gap-3"><OrderStatusBadge status={o.status} /><StatusBadge status={o.financial} /><Money value={o.total} /></div>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        {(canOrders || canStock) && <Card title="Alertas">
          {alertsQ.error && !alerts ? <EmptyState title="No se pudieron cargar las alertas" text={errorMessage(alertsQ.error)} /> : !alerts ? <Skeleton className="h-24" /> : (
            <ul className="space-y-3 text-sm">
              {alerts.refundPending.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-start gap-2 hover:underline"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden /><span>Reembolso pendiente · pedido #{o.number}</span></Link></li>)}
              {canStock && alerts.lowStock.map((l) => <li key={l.id}><Link href="/admin/inventory" className="flex items-start gap-2 hover:underline"><Package className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden /><span>{l.name}{l.sku ? ` · ${l.sku}` : ""} <Badge tone="warn">{l.stock} disponibles</Badge></span></Link></li>)}
              {canStock && alerts.lowStockTotal > alerts.lowStock.length && <li><Link href="/admin/inventory" className="adm-label hover:text-fg">+{alerts.lowStockTotal - alerts.lowStock.length} con stock bajo →</Link></li>}
              {alerts.unfulfilled > 0 && <li><Link href="/admin/orders" className="flex items-start gap-2 hover:underline"><ShoppingCart className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />{alerts.unfulfilled} pedidos pagados sin enviar</Link></li>}
              {!alerts.refundPending.length && !alerts.lowStock.length && !alerts.unfulfilled && <EmptyState title="Todo en orden" />}
            </ul>
          )}
        </Card>}
      </div>
    </>
  );
}
