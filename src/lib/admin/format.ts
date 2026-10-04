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

/** Zona horaria del negocio: todas las fechas del panel (listas, descuentos, entradas de fecha) se muestran y editan en ella. */
export const BUSINESS_TZ = TZ;
export const BUSINESS_TZ_LABEL = "hora de Colombia (UTC−5)";

/** Umbral único de "stock bajo" (disponible ≤ umbral). Es el valor por defecto del backend (`LOW_STOCK_DEFAULT` en inventory.service.ts); dashboard e inventario deben usar esta constante. */
export const LOW_STOCK_THRESHOLD = 5;

/** Nombres de los roles del sistema en español (el backend los entrega en inglés: Owner, Administrator…). */
const ROLE_NAMES: Record<string, string> = { owner: "Propietario", admin: "Administrador", editor: "Editor", fulfillment: "Logística", support: "Soporte", analyst: "Analista" };
export const roleLabel = (key: string | undefined, fallback = ""): string => (key ? ROLE_NAMES[key.toLowerCase()] : undefined) ?? (fallback || key || "—");
