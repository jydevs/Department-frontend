const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (n: number): string => cop.format(n);
export const formatNumber = (n: number): string => new Intl.NumberFormat("es-CO").format(n);
const TZ = "America/Bogota";
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const CONTROL = /[\u0000-\u001f\u007f\\]/;
/** Ruta interna segura: empieza con una sola "/", sin "\\" ni caracteres de control (los navegadores los normalizan a "//host"). */
export const isSafePath = (v: string): boolean => v.startsWith("/") && !v.startsWith("//") && !CONTROL.test(v);
/** Solo permite https: o rutas internas seguras. Devuelve null si no es seguro. */
export const safeHref = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (isSafePath(url)) return url;
  if (CONTROL.test(url)) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
export const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const uid = (): string => Math.random().toString(36).slice(2, 10);
