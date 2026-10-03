const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (n: number): string => cop.format(n);
export const formatNumber = (n: number): string => new Intl.NumberFormat("es-CO").format(n);
const TZ = "America/Bogota";
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export { isSafePath, safeHref } from "@/lib/url";
export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const uid = (): string => Math.random().toString(36).slice(2, 10);
