"use client";
import { AlertTriangle, Package, Plus, ShoppingCart, Tags, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BarList, Delta, SalesChart } from "@/components/dashboard/Charts";
import { Badge, Card, DateTime, EmptyState, Money, PageHeader, Skeleton, StatusBadge } from "@/components/ui/Display";
import { Select } from "@/components/ui/Form";
import { useAlerts, useAnalytics, useOrders } from "@/lib/api/orders";
import { formatNumber } from "@/lib/format";

const QUICK = [
  { href: "/products/new", label: "Nuevo producto", icon: Plus }, { href: "/orders", label: "Ver pedidos", icon: ShoppingCart },
  { href: "/collections", label: "Colecciones", icon: Tags }, { href: "/imports", label: "Importar CSV", icon: Upload },
];

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const a = useAnalytics(days).data;
  const alerts = useAlerts().data;
  const recent = useOrders({ q: "", financial: "", fulfillment: "", tag: "", from: "", to: "", page: 1 }).data?.items.slice(0, 5);
  const kpis = a ? [
    { label: "Ventas", value: <Money value={a.sales} />, d: <Delta cur={a.sales} prev={a.prevSales} /> },
    { label: "Pedidos", value: formatNumber(a.orders), d: <Delta cur={a.orders} prev={a.prevOrders} /> },
    { label: "Ticket promedio", value: <Money value={a.aov} />, d: <span className="text-muted">por pedido</span> },
    { label: "Clientes", value: formatNumber(a.customers), d: <span className="text-muted">registrados</span> },
  ] : [];
  return (
    <>
      <PageHeader title="Inicio" description="Resumen del rendimiento de la tienda"
        actions={<Select aria-label="Periodo" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-40"><option value={7}>Últimos 7 días</option><option value={14}>Últimos 14 días</option><option value={30}>Últimos 30 días</option></Select>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {a ? kpis.map((k) => (
          <Card key={k.label}><p className="text-xs text-muted">{k.label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p><p className="mt-1 text-xs">{k.d}</p></Card>
        )) : Array.from({ length: 4 }, (_, i) => <Card key={i}><Skeleton className="h-16" /></Card>)}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Ventas por día" className="lg:col-span-2">{a ? <SalesChart data={a.series} /> : <Skeleton className="h-56" />}</Card>
        <Card title="Top productos">{a ? <BarList items={a.top.map((t) => ({ label: t.title, value: t.revenue }))} /> : <Skeleton className="h-40" />}</Card>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK.map((q) => <Link key={q.href} href={q.href} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm hover:border-muted"><q.icon className="size-4 text-accent" aria-hidden />{q.label}</Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Pedidos recientes" className="lg:col-span-2" pad={false}
          actions={<Link href="/orders" className="text-xs text-accent hover:underline">Ver todos</Link>}>
          {!recent ? <div className="space-y-2 p-4"><Skeleton /><Skeleton /><Skeleton /></div> : (
            <ul>{recent.map((o) => (
              <li key={o.id}><Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-surface2/60">
                <div><p className="font-medium">#{o.number} · {o.customer.name}</p><p className="text-xs text-muted"><DateTime value={o.createdAt} /></p></div>
                <div className="flex items-center gap-2"><StatusBadge status={o.financial} /><Money value={o.total} /></div>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Alertas">
          {!alerts ? <Skeleton className="h-24" /> : (
            <ul className="space-y-3 text-sm">
              {alerts.refundPending.map((o) => <li key={o.id}><Link href={`/orders/${o.id}`} className="flex items-start gap-2 hover:underline"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden /><span>Reembolso pendiente · pedido #{o.number}</span></Link></li>)}
              {alerts.lowStock.slice(0, 5).map((l) => <li key={l.id + l.variant}><Link href={`/products/${l.id}`} className="flex items-start gap-2 hover:underline"><Package className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden /><span>{l.product} ({l.variant}) <Badge tone="warn">{l.stock} en stock</Badge></span></Link></li>)}
              {alerts.unfulfilled > 0 && <li className="flex items-start gap-2"><ShoppingCart className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />{alerts.unfulfilled} pedidos pagados sin enviar</li>}
              {!alerts.refundPending.length && !alerts.lowStock.length && !alerts.unfulfilled && <EmptyState title="Todo en orden" />}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
