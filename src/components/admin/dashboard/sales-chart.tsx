"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { Button, EmptyState, Money } from "@/components/admin/ui";
import { formatCop, formatNumber } from "@/lib/admin/format";
import type { GroupBy, SalesBucket } from "@/lib/admin/api/dashboard";
import { bucketLabel, bucketLabelLong, compactCop, niceScale } from "./format";

const HEIGHT = 280;
const M = { top: 14, right: 12, bottom: 30, left: 58 };

/** Gráfica de barras de ventas netas con tooltip, navegación por teclado y vista de tabla alternativa. */
export function SalesChart({ buckets, groupBy }: { buckets: SalesBucket[]; groupBy: GroupBy }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const descId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [asTable, buckets]);

  const totals = useMemo(
    () =>
      buckets.reduce(
        (t, b) => ({ net: t.net + b.netSales, gross: t.gross + b.grossSales, refunded: t.refunded + b.totalRefunded, orders: t.orders + b.orders }),
        { net: 0, gross: 0, refunded: 0, orders: 0 },
      ),
    [buckets],
  );
  const peak = useMemo(() => buckets.reduce<SalesBucket | null>((p, b) => (!p || b.netSales > p.netSales ? b : p), null), [buckets]);

  const plotW = Math.max(40, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.netSales, 0)));
  const scale = niceScale(maxVal, 4);
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step);
  const slot = buckets.length ? plotW / buckets.length : plotW;
  const barW = Math.max(2, Math.min(48, slot * 0.7));
  const y = (v: number) => M.top + plotH - (Math.max(0, v) / scale.max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 70))));

  const summary = `Ventas netas ${groupBy === "day" ? "por día" : groupBy === "week" ? "por semana" : "por mes"}: ${formatCop(totals.net)} en ${totals.orders} ${totals.orders === 1 ? "pedido" : "pedidos"}.${
    peak && peak.netSales > 0 ? ` Mejor ${groupBy === "day" ? "día" : groupBy === "week" ? "semana" : "mes"}: ${bucketLabelLong(peak.bucket, groupBy)} con ${formatCop(peak.netSales)}.` : ""
  }`;

  if (buckets.length === 0 || totals.gross === 0) {
    return <EmptyState title="Sin ventas en este periodo" description="Cuando haya pedidos pagados, verás aquí su evolución." className="py-10" />;
  }

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - M.left;
    const idx = Math.floor(x / slot);
    setActive(idx >= 0 && idx < buckets.length ? idx : null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = buckets.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = active === null ? 0 : Math.min(last, active + 1);
    else if (e.key === "ArrowLeft") next = active === null ? last : Math.max(0, active - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    setActive(next);
  };

  const act = active !== null ? buckets[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(M.left + slot * active + slot / 2, 90), width - 90) : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <span aria-hidden className="inline-block size-2.5 rounded-sm bg-info" /> Ventas netas (ventas − reembolsos)
        </p>
        <Button size="sm" variant="ghost" leftIcon={asTable ? <BarChart3 aria-hidden size={14} /> : <Table2 aria-hidden size={14} />} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? "Ver gráfica" : "Ver como tabla"}
        </Button>
      </div>

      {asTable ? (
        <div className="max-h-[300px] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{summary}</caption>
            <thead className="sticky top-0 bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {groupBy === "day" ? "Día" : groupBy === "week" ? "Semana" : "Mes"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Pedidos
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Ventas
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Reembolsos
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Netas
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.bucket} className="border-t border-border">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {bucketLabelLong(b.bucket, groupBy)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(b.orders)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Money value={b.grossSales} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Money value={b.totalRefunded} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    <Money value={b.netSales} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-strong bg-surface-2/60 font-semibold">
                <th scope="row" className="px-3 py-2 text-left">
                  Total
                </th>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(totals.orders)}</td>
                <td className="px-3 py-2 text-right">
                  <Money value={totals.gross} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={totals.refunded} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={totals.net} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div
          ref={wrapRef}
          className="relative rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
          tabIndex={0}
          role="group"
          aria-label="Gráfica de ventas. Usa las flechas izquierda y derecha para recorrer los valores."
          aria-describedby={descId}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          <p id={descId} className="sr-only">
            {summary}
          </p>
          <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setActive(null)} className="block touch-pan-y select-none">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--muted)">
                  {compactCop(t)}
                </text>
              </g>
            ))}
            {buckets.map((b, i) => {
              const cx = M.left + slot * i + slot / 2;
              const h = Math.max(b.netSales > 0 ? 2 : 0, y(0) - y(b.netSales));
              const isActive = active === i;
              return (
                <g key={b.bucket}>
                  {isActive ? <rect x={M.left + slot * i} y={M.top} width={slot} height={plotH} fill="var(--surface-2)" /> : null}
                  <rect x={cx - barW / 2} y={y(0) - h} width={barW} height={h} rx={Math.min(3, barW / 3)} fill="var(--info)" opacity={active === null || isActive ? 1 : 0.55} />
                  {i % labelEvery === 0 ? (
                    <text x={cx} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">
                      {bucketLabel(b.bucket, groupBy)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {act ? (
            <div
              aria-hidden
              style={{ left: tipLeft, top: 6 }}
              className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-md border border-border-strong bg-surface-3 p-2.5 text-xs shadow-md"
            >
              <p className="mb-1 font-semibold">{bucketLabelLong(act.bucket, groupBy)}</p>
              <dl className="space-y-0.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Netas</dt>
                  <dd className="font-medium tabular-nums">{formatCop(act.netSales)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Ventas</dt>
                  <dd className="tabular-nums">{formatCop(act.grossSales)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Reembolsos</dt>
                  <dd className="tabular-nums">{formatCop(act.totalRefunded)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Pedidos</dt>
                  <dd className="tabular-nums">{formatNumber(act.orders)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {act ? `${bucketLabelLong(act.bucket, groupBy)}: ${formatCop(act.netSales)} netos, ${act.orders} pedidos` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
