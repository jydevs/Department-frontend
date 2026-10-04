"use client";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { ApiError, errorMessage } from "../errors";
import { checkInt, checkText, hasMax2Decimals, optionalPhone } from "../validate";
import { useAction, useApi } from "../query";
import type {
  Address, AuditEntry, ContactMessage, Customer, CustomerOrder, Discount, DiscountRedemption, EmailTemplate, Page, Role, ShippingRate, ShippingZone, Staff, Subscriber, TaxSettings,
} from "../types";

/** Exporta CSV neutralizando fórmulas (=, +, -, @, tab, CR) solo en texto; los números se escriben tal cual. */
export function downloadCsv(name: string, rows: (string | number | boolean)[][]): void {
  const esc = (v: string | number | boolean) => {
    const s = String(v);
    const safe = typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const url = URL.createObjectURL(new Blob([`﻿${rows.map((r) => r.map(esc).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
/** Descarga un CSV generado por la API (se transmite con el token en memoria; el servidor ya neutraliza fórmulas). */
export async function downloadApiCsv(path: string, name: string, query?: Record<string, string | number | boolean | undefined | null>): Promise<void> {
  const blob = await api.download(path, { query });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
/** Valor aleatorio criptográficamente seguro (base32 sin ambigüedades). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomToken(len: number): string {
  const bytes = new Uint8Array(len); crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Los errores de la API (validación por campo incluida) los traduce `errorMessage` al mostrarse. */
const useAct = useAction;

type Q = Record<string, string | number | boolean | undefined | null>;
const clean = (q: Q): Q => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null));

/* ---------- Clientes ---------- */
interface CustomerAddressDto { id: string; label: string | null; isDefault: boolean; fullName: string; phone: string; department: string; city: string; address1: string; address2: string | null; postalCode: string | null }
interface CustomerDto {
  id: string; email: string; firstName: string; lastName: string; phone: string | null; acceptsMarketing: boolean; isActive: boolean; hasAccount: boolean; emailVerified: boolean;
  tags: string[]; lastLoginAt: string | null; anonymizedAt: string | null; createdAt: string; internalNote?: string | null; addresses?: CustomerAddressDto[];
}
interface CustomerDetailDto extends CustomerDto {
  orders: { id: string; orderNumber: number; status: string; paymentStatus: string; fulfillmentStatus: string; currency: string; total: number; createdAt: string }[];
}
const toAddress = (a: CustomerAddressDto): Address => ({ name: a.fullName, line1: a.address1, line2: a.address2 ?? undefined, city: a.city, department: a.department, phone: a.phone, postalCode: a.postalCode ?? undefined });
const toCustomer = (c: CustomerDto): Customer => ({
  id: c.id, firstName: c.firstName, lastName: c.lastName, name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, phone: c.phone ?? "", tags: c.tags, note: c.internalNote ?? "",
  marketing: c.acceptsMarketing, isActive: c.isActive, hasAccount: c.hasAccount, emailVerified: c.emailVerified, createdAt: c.createdAt, lastLoginAt: c.lastLoginAt,
  addresses: (c.addresses ?? []).map(toAddress), anonymized: !!c.anonymizedAt,
});
export interface CustomerFilters { q: string; tag: string; marketing: string; active: string; page: number }
const customerQuery = (f: Omit<CustomerFilters, "page">): Q => clean({ q: f.q.trim(), tag: f.tag.trim(), acceptsMarketing: f.marketing, isActive: f.active });
export const useCustomers = (f: CustomerFilters) =>
  useApi<Page<CustomerDto>, Page<Customer>>(["customers"], "/admin/customers", { query: { ...customerQuery(f), page: f.page, pageSize: 20 }, select: (p) => ({ ...p, items: p.items.map(toCustomer) }) });
export const useCustomer = (id: string) =>
  useApi<CustomerDetailDto, { customer: Customer; orders: CustomerOrder[] }>(["customer", id], `/admin/customers/${id}`, {
    select: (d) => ({ customer: toCustomer(d), orders: d.orders.map((o) => ({ id: o.id, number: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, fulfillmentStatus: o.fulfillmentStatus, currency: o.currency, total: o.total, createdAt: o.createdAt })) }),
  });
export const useSaveCustomer = () => useAct((c: Customer) => {
  const firstName = checkText(c.firstName, "El nombre", 1, 120), lastName = checkText(c.lastName, "El apellido", 1, 120);
  const phone = optionalPhone(c.phone, "El teléfono del cliente");
  return api.patch(`/admin/customers/${c.id}`, { firstName, lastName, phone, tags: c.tags, internalNote: c.note.trim() || null, isActive: c.isActive });
},
  { invalidate: [["customers"], ["customer"]], success: "Cliente actualizado" });
export const useAnonymize = () => useAct((id: string) => api.post(`/admin/customers/${id}/erase`), { invalidate: [["customers"], ["customer"], ["orders"], ["order"]], success: "Cliente anonimizado (Habeas Data)" });
export const exportCustomers = (f: Omit<CustomerFilters, "page">) => downloadApiCsv("/admin/customers/export", "clientes.csv", customerQuery(f));

/* ---------- Descuentos ---------- */
interface DiscountDto { id: string; code: string; title: string; type: Discount["kind"]; value: number; minSubtotal: number | null; startsAt: string; endsAt: string | null; usageLimit: number | null; usedCount: number; oncePerEmail: boolean; isActive: boolean }
const toDiscount = (d: DiscountDto): Discount => ({ id: d.id, code: d.code, title: d.title, kind: d.type, value: d.value, active: d.isActive, minSubtotal: d.minSubtotal, usageLimit: d.usageLimit, oncePerEmail: d.oncePerEmail, startsAt: d.startsAt, endsAt: d.endsAt, used: d.usedCount });
export interface DiscountFilters { q: string; active: string; page: number }
export const useDiscounts = (f: DiscountFilters) =>
  useApi<Page<DiscountDto>, Page<Discount>>(["discounts"], "/admin/discounts", { query: clean({ q: f.q.trim(), isActive: f.active, page: f.page, pageSize: 20 }), select: (p) => ({ ...p, items: p.items.map(toDiscount) }) });
export const useRedemptions = (id: string | null) =>
  useApi<Page<{ id: string; orderNumber: number | null; email: string; amount: number; createdAt: string }>, Page<DiscountRedemption>>(["discount-redemptions", id], id ? `/admin/discounts/${id}/redemptions` : null, {
    query: { page: 1, pageSize: 50 }, select: (p) => ({ ...p, items: p.items.map((r) => ({ id: r.id, orderNumber: r.orderNumber, email: r.email, amount: r.amount, at: r.createdAt })) }),
  });
export const blankDiscount = (): Discount => ({ id: "", code: "", title: "", kind: "percent", value: 10, active: true, minSubtotal: null, usageLimit: null, oncePerEmail: false, startsAt: new Date().toISOString(), endsAt: null, used: 0 });
export const useSaveDiscount = () => useAct((x: Discount) => {
  const code = x.code.trim().toUpperCase();
  if (!x.id && !/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Código inválido (3–40 letras, números, - o _)");
  const title = checkText(x.title, "El título", 2, 120);
  if (x.kind === "percent") {
    if (!Number.isInteger(x.value)) throw new Error("El porcentaje debe ser un número entero (sin decimales)");
    if (x.value < 1 || x.value > 100) throw new Error("El porcentaje debe estar entre 1 y 100");
  }
  if (x.kind === "fixed") {
    if (!Number.isInteger(x.value) || x.value <= 0) throw new Error("El monto debe ser un entero mayor a 0");
    checkInt(x.value, "El monto", 1, 10_000_000_000);
  }
  if (x.minSubtotal != null) checkInt(x.minSubtotal, "El subtotal mínimo", 0, 10_000_000_000);
  if (x.usageLimit != null) {
    if (!Number.isInteger(x.usageLimit) || x.usageLimit <= 0) throw new Error("El límite de usos debe ser un entero mayor a 0 (déjalo vacío para no limitar)");
    checkInt(x.usageLimit, "El límite de usos", 1, 10_000_000);
  }
  if (!x.startsAt || Number.isNaN(new Date(x.startsAt).getTime())) throw new Error("La fecha de inicio no es válida");
  if (x.endsAt && new Date(x.endsAt) <= new Date(x.startsAt)) throw new Error("La fecha de fin debe ser posterior al inicio");
  const common = { title, value: x.kind === "free_shipping" ? 0 : x.value, minSubtotal: x.minSubtotal || null, startsAt: x.startsAt, endsAt: x.endsAt, usageLimit: x.usageLimit ?? null, oncePerEmail: x.oncePerEmail, isActive: x.active };
  return x.id ? api.patch(`/admin/discounts/${x.id}`, common) : api.post("/admin/discounts", { code, type: x.kind, ...common });
}, { invalidate: [["discounts"]], success: "Descuento guardado", inline: true });
export const useToggleDiscount = () => useAct((v: { id: string; active: boolean }) => api.patch(`/admin/discounts/${v.id}`, { isActive: v.active }), { invalidate: [["discounts"]], success: "Estado actualizado" });
export const useDeleteDiscount = () => useAct((id: string) => api.delete(`/admin/discounts/${id}`), { invalidate: [["discounts"]], success: "Descuento eliminado" });

/* ---------- Envíos e impuestos ---------- */
interface RateDto { id: string; zoneId: string; name: string; price: number; freeOverSubtotal: number | null; minDays: number | null; maxDays: number | null; isActive: boolean; position: number }
interface ZoneDto { id: string; name: string; departments: string[]; isActive: boolean; rates: RateDto[] }
const toRate = (r: RateDto): ShippingRate => ({ id: r.id, name: r.name, price: r.price, freeOver: r.freeOverSubtotal, minDays: r.minDays, maxDays: r.maxDays, active: r.isActive, position: r.position });
export const useZones = () => useApi<ZoneDto[], ShippingZone[]>(["zones"], "/admin/shipping/zones", { select: (z) => z.map((x) => ({ id: x.id, name: x.name, departments: x.departments, active: x.isActive, rates: x.rates.map(toRate) })) });
/** Las tarifas nuevas llevan un id temporal con este prefijo. */
export const NEW_RATE = "new_";
const rateBody = (r: ShippingRate) => ({ name: r.name.trim(), price: r.price, freeOverSubtotal: r.freeOver, minDays: r.minDays, maxDays: r.maxDays, isActive: r.active, position: r.position });
/**
 * Fallo al guardar una zona que conserva lo ya aplicado en el servidor (id de la zona y de las tarifas creadas), para que el
 * diálogo se actualice con ese estado y el reintento haga PATCH en lugar de crear otra vez.
 */
export class ZoneSaveError extends Error {
  zone: ShippingZone;
  constructor(message: string, zone: ShippingZone) { super(message); this.zone = zone; }
}
const MAX_MONEY = 10_000_000_000;
/** Valida TODA la zona (y todas sus tarifas) antes de tocar el servidor. */
function validateZone(z: ShippingZone): void {
  checkText(z.name, "El nombre de la zona", 2, 120);
  if (!z.departments.length) throw new Error("Selecciona al menos un departamento");
  z.rates.forEach((r, i) => {
    const at = `Tarifa ${i + 1}${r.name.trim() ? ` («${r.name.trim().slice(0, 30)}»)` : ""}`;
    checkText(r.name, `${at}: el nombre`, 1, 120);
    checkInt(r.price, `${at}: el precio`, 0, MAX_MONEY);
    checkInt(r.freeOver, `${at}: «gratis desde»`, 0, MAX_MONEY);
    checkInt(r.minDays, `${at}: los días mínimos`, 0, 365);
    checkInt(r.maxDays, `${at}: los días máximos`, 0, 365);
    if (r.minDays != null && r.maxDays != null && r.minDays > r.maxDays) throw new Error(`${at}: los días mínimos no pueden superar a los máximos`);
  });
}
/**
 * Guarda zona + tarifas de forma recuperable: valida todo primero; el diff de tarifas se calcula contra el estado ACTUAL del servidor
 * (no contra una copia vieja), los DELETE ignoran 404 y cada tarifa creada recibe su id real en `ZoneSaveError.zone`.
 */
async function saveZone(z: ShippingZone): Promise<void> {
  validateZone(z);
  const work: ShippingZone = structuredClone(z);
  let created = false, done = 0;
  const fail = (what: string, e: unknown): never => {
    const state = created ? " La zona ya quedó guardada en el servidor; corrige y pulsa Guardar otra vez para completar el resto." : done ? " Los pasos anteriores ya se aplicaron; pulsa Guardar otra vez para completar el resto." : "";
    throw new ZoneSaveError(`No se pudo ${what}: ${errorMessage(e)}${state}`, work);
  };
  const body = { name: z.name.trim(), departments: z.departments, isActive: z.active };
  let before: RateDto[] = [];
  if (work.id) {
    try { await api.patch(`/admin/shipping/zones/${work.id}`, body); done++; } catch (e) { fail("guardar los datos de la zona", e); }
    try { before = (await api.get<ZoneDto>(`/admin/shipping/zones/${work.id}`)).rates; } catch (e) { fail("leer las tarifas actuales de la zona", e); }
  } else {
    try { work.id = (await api.post<ZoneDto>("/admin/shipping/zones", body)).id; created = true; } catch (e) { fail("crear la zona", e); }
  }
  for (const r of before) {
    if (work.rates.some((x) => x.id === r.id)) continue;
    try { await api.delete(`/admin/shipping/rates/${r.id}`); done++; } catch (e) { if (!(e instanceof ApiError && e.status === 404)) fail(`eliminar la tarifa «${r.name}»`, e); }
  }
  for (const [i, r] of work.rates.entries()) {
    const rate = { ...r, position: i };
    const label = r.name.trim() || `n.º ${i + 1}`;
    if (r.id.startsWith(NEW_RATE)) {
      try { const c = await api.post<RateDto>("/admin/shipping/rates", { zoneId: work.id, ...rateBody(rate) }); work.rates[i] = { ...rate, id: c.id }; done++; } catch (e) { fail(`crear la tarifa «${label}»`, e); }
    } else {
      const cur = before.find((x) => x.id === r.id);
      if (cur && JSON.stringify(toRate(cur)) === JSON.stringify(rate)) continue;
      try { await api.patch(`/admin/shipping/rates/${r.id}`, rateBody(rate)); done++; } catch (e) { fail(`guardar la tarifa «${label}»`, e); }
    }
  }
}
export const useSaveZone = () => {
  const qc = useQueryClient();
  return useAct(async (zone: ShippingZone) => {
    try { await saveZone(zone); } finally { await qc.invalidateQueries({ queryKey: ["zones"] }); } // también tras un fallo parcial: la lista refleja lo ya guardado
  }, { success: "Zona guardada", inline: true });
};
export const useDeleteZone = () => useAct((id: string) => api.delete(`/admin/shipping/zones/${id}`), { invalidate: [["zones"]], success: "Zona eliminada" });
export const useTax = () => useApi<{ pricesIncludeTax: boolean; ratePercent: number; label: string }, TaxSettings>(["tax"], "/admin/taxes", { select: (t) => ({ rate: t.ratePercent, included: t.pricesIncludeTax, label: t.label }) });
export const useSaveTax = () => useAct((t: TaxSettings) => {
  if (!Number.isFinite(t.rate) || t.rate < 0 || t.rate > 100) throw new Error("La tarifa debe estar entre 0 y 100");
  if (!hasMax2Decimals(t.rate)) throw new Error("La tarifa admite como máximo 2 decimales (ej. 19 o 19.5)");
  const label = checkText(t.label, "La etiqueta (ej. IVA)", 1, 40);
  return api.put("/admin/taxes", { pricesIncludeTax: t.included, ratePercent: t.rate, label });
}, { invalidate: [["tax"]], success: "Impuestos guardados", inline: true });

/* ---------- Marketing ---------- */
interface SubscriberDto { id: string; email: string; status: Subscriber["status"]; source: string; consentAt: string | null; createdAt: string }
export const useSubscribers = (status: string, q: string, page: number) =>
  useApi<Page<SubscriberDto>, Page<Subscriber>>(["subscribers"], "/admin/newsletter", { query: clean({ status, q: q.trim(), page, pageSize: 25 }) });
export const useUnsubscribe = () => useAct((id: string) => api.post(`/admin/newsletter/${id}/unsubscribe`), { invalidate: [["subscribers"]], success: "Suscriptor dado de baja" });
export const exportSubscribers = () => downloadApiCsv("/admin/newsletter/export", "suscriptores.csv");
interface MessageDto { id: string; name: string; email: string; subject: string | null; message: string; status: ContactMessage["status"]; createdAt: string }
const toMessage = (m: MessageDto): ContactMessage => ({ id: m.id, name: m.name, email: m.email, subject: m.subject, body: m.message, status: m.status, createdAt: m.createdAt });
export const useMessages = (status: string, page: number) =>
  useApi<Page<MessageDto>, Page<ContactMessage>>(["messages"], "/admin/contact-messages", { query: clean({ status, page, pageSize: 25 }), select: (p) => ({ ...p, items: p.items.map(toMessage) }) });
export const useSetMessageStatus = () => useAct(({ id, status }: { id: string; status: ContactMessage["status"] }) => api.patch(`/admin/contact-messages/${id}`, { status }), { invalidate: [["messages"]], success: "Estado actualizado" });
export const useDeleteMessage = () => useAct((id: string) => api.delete(`/admin/contact-messages/${id}`), { invalidate: [["messages"]], success: "Mensaje eliminado" });

/* ---------- Plantillas de correo ---------- */
const TEMPLATE_NAMES: Record<string, string> = {
  order_confirmation: "Confirmación de pedido", order_shipped: "Pedido enviado", order_cancelled: "Pedido cancelado", password_reset: "Restablecer contraseña", email_verify: "Verificar correo",
  welcome: "Bienvenida", refund_issued: "Reembolso emitido", newsletter_confirm: "Confirmar newsletter", account_exists: "La cuenta ya existe",
};
interface TemplateDto { key: string; subject: string; bodyHtml: string; bodyText: string; isActive: boolean; variables: string[]; updatedAt: string }
const toTemplate = (t: TemplateDto): EmailTemplate => ({ key: t.key, name: TEMPLATE_NAMES[t.key] ?? t.key, subject: t.subject, html: t.bodyHtml, text: t.bodyText, active: t.isActive, variables: t.variables, updatedAt: t.updatedAt });
export const useEmailTemplates = () => useApi<TemplateDto[], EmailTemplate[]>(["emails"], "/admin/email-templates", { select: (l) => l.map(toTemplate) });
export const useSaveEmail = () => useAct(async (t: EmailTemplate) => {
  try { await api.put(`/admin/email-templates/${t.key}`, { subject: t.subject.trim(), bodyHtml: t.html, bodyText: t.text, isActive: t.active }); }
  catch (e) {
    const problems = e instanceof ApiError && e.code === "INVALID_TEMPLATE" ? (e.details as unknown as { problems?: string[] })?.problems : undefined;
    if (problems?.length) throw new Error(`Plantilla inválida: ${problems.join("; ")}`);
    throw e;
  }
}, { invalidate: [["emails"], ["email-preview"]], success: "Plantilla guardada" });
/** Vista previa renderizada por el servidor con datos de ejemplo (refleja la versión GUARDADA). */
export const useEmailPreview = (key: string, enabled: boolean, version: string) =>
  useQuery({ queryKey: ["email-preview", key, version], enabled, queryFn: () => api.post<{ subject: string; bodyHtml: string; bodyText: string }>(`/admin/email-templates/${key}/preview`, {}) });
export const useSendTest = () => useAct((v: { key: string; to: string }) => {
  if (!/^\S+@\S+\.\S+$/.test(v.to)) throw new Error("Correo inválido");
  // El API responde 202 sin cuerpo y api-client solo trata 204 como vacío: ese SyntaxError no es un fallo del envío.
  return api.post(`/admin/email-templates/${v.key}/test-send`, { to: v.to.trim() }).catch((e: unknown) => { if (!(e instanceof SyntaxError)) throw e; });
}, { success: "Correo de prueba encolado para envío" });

/* ---------- Equipo ---------- */
interface StaffDto { id: string; email: string; fullName: string; isActive: boolean; roleId: string; totpEnabled: boolean; lastLoginAt: string | null }
const toStaff = (s: StaffDto): Staff => ({ id: s.id, name: s.fullName, email: s.email, roleId: s.roleId, active: s.isActive, twoFactor: s.totpEnabled, lastLogin: s.lastLoginAt });
/** Hasta 100 personas (para resolver nombres en auditoría); `total` permite avisar si hay más de las que se muestran. */
export const useStaff = () => useApi<Page<StaffDto>, { items: Staff[]; total: number }>(["staff", "names"], "/admin/staff", { query: { page: 1, pageSize: 100 }, select: (p) => ({ items: p.items.map(toStaff), total: p.total }) });
export const useStaffPage = (page: number) => useApi<Page<StaffDto>, Page<Staff>>(["staff", "page"], "/admin/staff", { query: { page, pageSize: 25 }, select: (p) => ({ ...p, items: p.items.map(toStaff) }) });
export const useRoles = (enabled = true) => useApi<Role[]>(["roles"], "/admin/roles", { enabled, staleTime: 5 * 60_000 });
/** Permisos del sistema en el orden del backend (src/identity/permissions.ts), para la matriz de roles. */
export const PERMISSION_ORDER = ["staff:read", "staff:write", "roles:read", "roles:write", "audit:read", "settings:read", "settings:write", "products:read", "products:write", "collections:read", "collections:write", "inventory:read", "inventory:write", "orders:read", "orders:write", "customers:read", "customers:write", "content:read", "content:write", "content:publish", "media:write", "discounts:read", "discounts:write", "shipping:read", "shipping:write", "marketing:read", "marketing:write", "import:read", "import:write", "analytics:read"];
export const ROLE_INFO: Record<string, string> = {
  owner: "Control total, incluido el manejo de roles y propietarios.", admin: "Todo excepto administrar roles.", editor: "Contenido, catálogo y colecciones.",
  fulfillment: "Pedidos e inventario para el despacho.", support: "Atención: pedidos, clientes y marketing en lectura.", analyst: "Solo lectura de casi todo el panel.",
};
export const useSaveStaff = () => useAct(async (v: { id?: string; name: string; email: string; roleId: string; active: boolean }) => {
  const name = checkText(v.name, "El nombre", 1, 255);
  if (!v.roleId) throw new Error("Selecciona un rol");
  if (v.id) { await api.patch(`/admin/staff/${v.id}`, { fullName: name, roleId: v.roleId, isActive: v.active }); return { tempPassword: null as string | null }; }
  const email = v.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Correo inválido");
  const r = await api.post<{ password: string }>("/admin/staff", { email, fullName: name, roleId: v.roleId });
  return { tempPassword: r.password as string | null };
}, { invalidate: [["staff"]], success: "Personal guardado", inline: true });
export const useSetStaffActive = () => useAct((v: { id: string; active: boolean }) => api.patch(`/admin/staff/${v.id}`, { isActive: v.active }), { invalidate: [["staff"]], success: "Estado actualizado" });

/* ---------- Auditoría (cursor) ---------- */
export interface AuditFilters { actorId: string; entity: string }
interface AuditDto { id: string; actorType: string; actorId: string | null; action: string; entityType: string; entityId: string | null; diff: unknown; requestId: string | null; ip: string | null; createdAt: string }
/** El backend guarda un solo `diff`: `{campo: {old,new}}` o `{campo: valor}`. Se reparte en antes/después para la tabla de cambios. */
const toAudit = (a: AuditDto): AuditEntry => {
  let before: Record<string, unknown> | null = null, after: Record<string, unknown> | null = null;
  if (a.diff && typeof a.diff === "object" && !Array.isArray(a.diff)) {
    before = {}; after = {};
    for (const [k, v] of Object.entries(a.diff as Record<string, unknown>)) {
      if (v && typeof v === "object" && !Array.isArray(v) && "old" in v && "new" in v) { before[k] = (v as { old: unknown }).old; after[k] = (v as { new: unknown }).new; }
      else after[k] = v;
    }
  } else if (a.diff != null) after = { valor: a.diff };
  return { id: a.id, at: a.createdAt, actorType: a.actorType, actorId: a.actorId, action: a.action, entity: a.entityType, entityId: a.entityId ?? "—", before, after, ip: a.ip ?? "—", requestId: a.requestId };
};
export const useAuditLog = (f: AuditFilters, enabled = true) =>
  useInfiniteQuery({
    queryKey: ["audit", f], enabled, initialPageParam: "" as string,
    queryFn: async ({ pageParam }) => {
      const r = await api.get<{ items: AuditDto[]; nextCursor: string | null; hasMore: boolean }>("/admin/audit-logs", { query: clean({ limit: 25, cursor: pageParam, entityType: f.entity, actorId: f.actorId }) });
      return { items: r.items.map(toAudit), nextCursor: r.nextCursor };
    },
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });

/* ---------- Mantenimiento ---------- */
export interface MaintenanceResult { executed: boolean; tasks: { task: string; affected: number; error?: string }[] }
export const useRunMaintenance = () => useAct(() => api.post<MaintenanceResult>("/admin/maintenance/run"), { invalidate: [["audit"]], inline: true });

/* ---------- Cuenta ---------- */
export const useTwoFaSetup = () => useAct(async () => {
  const { otpauthUrl } = await api.post<{ otpauthUrl: string }>("/auth/2fa/setup");
  return { uri: otpauthUrl, secret: new URL(otpauthUrl).searchParams.get("secret") ?? "" };
}, { inline: true });
export const useTwoFaEnable = () => useAct((v: { password: string; code: string }) => api.post<{ recoveryCodes: string[] }>("/auth/2fa/enable", v), { inline: true });
export const useTwoFaDisable = () => useAct((v: { password: string; code: string }) => api.post("/auth/2fa/disable", v), { success: "Verificación en dos pasos desactivada", inline: true });
export const useChangePassword = () => useAct((v: { current: string; next: string }) => api.post("/auth/change-password", { current: v.current, new: v.next }), { inline: true });
