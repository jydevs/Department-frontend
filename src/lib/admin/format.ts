const TZ = "America/Bogota";
const LOCALE = "es-CO";

const copFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "COP", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat(LOCALE);

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** COP entero → "$189.000". */
export function formatCop(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return copFmt.format(Math.round(amount)).replace(/ /g, "");
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return numFmt.format(n);
}

/** "2 oct 2026". */
export function formatDate(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "2 oct 2026, 3:45 p. m.". */
export function formatDateTime(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** "hace 5 minutos", "mañana". */
export function relativeTime(v: string | number | Date | null | undefined, now: number = Date.now()): string {
  const d = toDate(v);
  if (!d) return "—";
  const diffSec = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "ahora mismo";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return rtf.format(diffSec, "second");
}

/** "Camiseta Básica Ñandú" → "camiseta-basica-nandu". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
