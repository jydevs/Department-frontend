"use client";
import { AlertTriangle, ArrowUpRight, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BarList, Delta, SalesChart } from "@/components/admin/dashboard/Charts";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/admin/ui/Display";
import { Select } from "@/components/admin/ui/Form";
import { useAlerts, useAnalytics, useOrders } from "@/lib/admin/api/orders";
import { formatNumber } from "@/lib/admin/format";

const QUICK = [
  { href: "/admin/products/new", label: "Nuevo producto" }, { href: "/admin/orders", label: "Ver pedidos" },
  { href: "/admin/collections", label: "Colecciones" }, { href: "/admin/imports", label: "Importar CSV" },
];

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const a = useAnalytics(days).data;
  const alerts = useAlerts().data;
  const recent = useOrders({ q: "", financial: "", fulfillment: "", tag: "", from: "", to: "", page: 1 }).data?.items.slice(0, 5);
  const kpis = a ? [
    { label: "Ventas", value: <Money value={a.sales} />, d: <Delta cur={a.sales} prev={a.prevSales} /> },
    { label: "Pedidos", value: formatNumber(a.orders), d: <Delta cur={a.orders} prev={a.prevOrders} /> },
    { label: "Ticket promedio", value: <Money value={a.aov} />, d: <span className="adm-sub text-muted">por pedido</span> },
    { label: "Clientes", value: formatNumber(a.customers), d: <span className="adm-sub text-muted">registrados</span> },
  ] : [];
  return (
    <>
      <PageHeader title="Inicio" description="Resumen del rendimiento de la tienda"
        actions={<Select aria-label="Periodo" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-44"><option value={7}>Últimos 7 días</option><option value={14}>Últimos 14 días</option><option value={30}>Últimos 30 días</option></Select>} />

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
        <Card title="Ventas por día" className="lg:col-span-2">{a ? <SalesChart data={a.series} /> : <Skeleton className="h-56" />}</Card>
        <Card title="Top productos">{a ? <BarList items={a.top.map((t) => ({ label: t.title, value: t.revenue }))} /> : <Skeleton className="h-40" />}</Card>
      </div>

      <nav aria-label="Accesos rápidos" className="mb-8 grid grid-cols-2 border border-line lg:grid-cols-4">
        {QUICK.map((q, i) => (
          <Link key={q.href} href={q.href} className="adm-invert group flex items-center justify-between border-line px-5 py-4 [&:not(:last-child)]:border-r">
            <span className="font-condensed text-xs tracking-[0.16em]"><span className="adm-label mr-3">0{i + 1}</span>{q.label}</span>
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Pedidos recientes" className="lg:col-span-2" pad={false} actions={<Link href="/admin/orders" className="adm-label inline-block py-2 hover:text-fg">Ver todos →</Link>}>
          {!recent ? <div className="space-y-2 p-4"><Skeleton /><Skeleton /><Skeleton /></div> : (
            <ul>{recent.map((o) => (
              <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="adm-invert flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 last:border-0">
                <div><p className="font-condensed text-sm tracking-[0.1em]">#{o.number} · {o.customer.name}</p><p className="adm-sub text-xs text-muted"><DateTime value={o.createdAt} /></p></div>
                <div className="flex items-center gap-3"><StatusBadge status={o.financial} /><Money value={o.total} /></div>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Alertas">
          {!alerts ? <Skeleton className="h-24" /> : (
            <ul className="space-y-3 text-sm">
              {alerts.refundPending.map((o) => <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-start gap-2 hover:underline"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden /><span>Reembolso pendiente · pedido #{o.number}</span></Link></li>)}
              {alerts.lowStock.slice(0, 5).map((l) => <li key={l.id + l.variant}><Link href={`/admin/products/${l.id}`} className="flex items-start gap-2 hover:underline"><Package className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden /><span>{l.product} ({l.variant}) <Badge tone="warn">{l.stock} en stock</Badge></span></Link></li>)}
              {alerts.unfulfilled > 0 && <li className="flex items-start gap-2"><ShoppingCart className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />{alerts.unfulfilled} pedidos pagados sin enviar</li>}
              {!alerts.refundPending.length && !alerts.lowStock.length && !alerts.unfulfilled && <EmptyState title="Todo en orden" />}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
