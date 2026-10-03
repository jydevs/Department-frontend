"use client";
import { useId, useState } from "react";
import { formatMoney } from "@/lib/format";

/** Gráfica de líneas SVG propia: periodo actual (acento) vs. anterior (gris punteado). */
export function SalesChart({ data }: { data: { day: string; value: number; prev: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const W = 720, H = 220, P = { l: 56, r: 12, t: 12, b: 24 };
  const max = Math.max(...data.flatMap((d) => [d.value, d.prev])) * 1.1 || 1;
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const path = (k: "value" | "prev") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const h = hover === null ? null : data[hover];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ventas por día comparadas con el periodo anterior"
        onMouseLeave={() => setHover(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))))); }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".3" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border)" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{t >= 1e6 ? `$${(t / 1e6).toFixed(1)}M` : `$${Math.round(t / 1000)}k`}</text></g>))}
        <path d={`${path("value")} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid})`} />
        <path d={path("prev")} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={path("value")} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted)">{data[i]?.day.slice(5)}</text>)}
        {hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--muted)" strokeDasharray="2 3" /><circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="var(--accent)" /></g>}
      </svg>
      {h && <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow"><p className="font-medium">{h.day}</p><p className="text-accent">Actual: {formatMoney(h.value)}</p><p className="text-muted">Anterior: {formatMoney(h.prev)}</p></div>}
      <div className="mt-1 flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-accent" />Periodo actual</span><span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 border-t border-dashed border-muted" />Periodo anterior</span></div>
    </div>
  );
}

export function BarList({ items }: { items: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{i.label}</span><span className="tabular-nums text-muted">{i.sub ?? formatMoney(i.value)}</span></div>
          <div className="h-2 rounded-full bg-surface2" role="presentation"><div className="h-2 rounded-full bg-accent" style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Delta({ cur, prev }: { cur: number; prev: number }) {
  const pct = prev ? ((cur - prev) / prev) * 100 : 0;
  return <span className={pct >= 0 ? "text-ok" : "text-red-500"}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% <span className="text-muted">vs. anterior</span></span>;
}
