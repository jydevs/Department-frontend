const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (n: number): string => cop.format(n);
export const formatNumber = (n: number): string => new Intl.NumberFormat("es-CO").format(n);
const TZ = "America/Bogota";
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};
/** Solo permite https: o rutas internas. Devuelve null si no es seguro. */
export const safeHref = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const uid = (): string => Math.random().toString(36).slice(2, 10);
