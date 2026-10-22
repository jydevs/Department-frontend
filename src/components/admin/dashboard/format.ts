import type { GroupBy } from "@/lib/admin/api/dashboard";

const dayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" });
const dayLongFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "short", year: "numeric" });
const monthLongFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "long", year: "numeric" });
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function parse(bucket: string): Date {
  return new Date(`${bucket}T00:00:00Z`);
}

/** Etiqueta corta del eje X ("2 oct", "oct 2026"). */
export function bucketLabel(bucket: string, groupBy: GroupBy): string {
  const d = parse(bucket);
  return groupBy === "month" ? monthFmt.format(d) : dayFmt.format(d);
}

/** Etiqueta larga para tooltip/tabla. */
export function bucketLabelLong(bucket: string, groupBy: GroupBy): string {
  const d = parse(bucket);
  if (groupBy === "month") return monthLongFmt.format(d);
  if (groupBy === "week") return `Semana del ${dayLongFmt.format(d)}`;
  return dayLongFmt.format(d);
}

/** "$1,2 M", "$350 mil" para ejes. */
export function compactCop(n: number): string {
  if (n === 0) return "$0";
  return `$${compact.format(n).replace(/\s?mil$/, " mil").replace(/\sM$/, " M")}`;
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/** "+12,5 %" / "−3 %". */
export function formatChange(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${signed.format(Math.abs(pct))} %`;
}

/** Máximo "bonito" para el eje Y y sus marcas. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const rough = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * pow;
  return { max: step * Math.ceil(max / step), step };
}
