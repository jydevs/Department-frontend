"use client";
import { useQuery } from "@tanstack/react-query";
import { db, logAudit, nid, now, paginate, wait } from "../mock/db";
import { useAction, useMock, usePaged } from "../query";
import type { ContactMessage, Customer, Discount, EmailTemplate, ImportJob, ShippingZone, Staff } from "../types";

/** Exporta CSV neutralizando fórmulas (=, +, -, @, tab, CR) solo en texto; los números se escriben tal cual. */
export function downloadCsv(name: string, rows: (string | number | boolean)[][]): void {
  const esc = (v: string | number | boolean) => {
    const s = String(v);
    const safe = typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const url = URL.createObjectURL(new Blob([`\ufeff${rows.map((r) => r.map(esc).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
/** Valor aleatorio criptográficamente seguro (base32 sin ambigüedades). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomToken(len: number): string {
  const bytes = new Uint8Array(len); crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/* ---------- Clientes ---------- */
export interface CustomerFilters { q: string; tag: string; marketing: string; page: number }
export const useCustomers = (f: CustomerFilters) => usePaged<Customer>(["customers", f], { page: f.page, pageSize: 10 }, () => {
  const q = f.q.toLowerCase();
  return paginate(db().customers.filter((c) => (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) && (!f.tag || c.tags.includes(f.tag)) && (!f.marketing || String(c.marketing) === f.marketing)), f.page, 10);
});
export const useCustomer = (id: string) => useMock(["customer", id], () => { const c = db().customers.find((x) => x.id === id); return c ? { customer: c, orders: db().orders.filter((o) => o.customer.id === id) } : null; });
export const useCustomerTags = () => useMock(["customer-tags"], () => [...new Set(db().customers.flatMap((c) => c.tags))]);
export const useSaveCustomer = () => useAction((c: Customer) => { if (!/^\S+@\S+\.\S+$/.test(c.email)) throw new Error("Correo inválido"); const d = db(); d.customers = d.customers.map((x) => (x.id === c.id ? c : x)); logAudit("customer.update", "customer", c.id, null, { email: c.email }); }, { invalidate: [["customers"], ["customer"], ["customer-tags"]], success: "Cliente actualizado" });
export const useAnonymize = () => useAction((id: string) => {
  const d = db(); const c = d.customers.find((x) => x.id === id); if (!c) return;
  c.name = "Cliente anonimizado"; c.email = `anon-${id}@anonimo.invalid`; c.phone = ""; c.note = ""; c.addresses = []; c.anonymized = true; c.marketing = false;
  const blank = { name: "Cliente anonimizado", line1: "—", city: "—", department: "—", phone: "" };
  for (const o of d.orders) if (o.customer.id === id) { o.customer.name = c.name; o.customer.email = c.email; o.customer.phone = ""; o.shippingAddress = { ...blank }; o.billingAddress = { ...blank }; }
  for (const s of d.subscribers) if (s.email === c.email) s.status = "unsubscribed";
  logAudit("customer.anonymize", "customer", id, null, { anonymized: true });
}, { invalidate: [["customers"], ["customer"], ["orders"], ["order"], ["customer-tags"]], success: "Cliente anonimizado (Habeas Data)" });

/* ---------- Descuentos ---------- */
export const useDiscounts = () => useMock(["discounts"], () => db().discounts);
export const blankDiscount = (): Discount => ({ id: "", code: "", kind: "percentage", value: 10, active: true, minSubtotal: 0, usageLimit: null, perCustomer: false, startsAt: now(), endsAt: null, used: 0, redemptions: [] });
export const useSaveDiscount = () => useAction((x: Discount) => {
  const code = x.code.trim().toUpperCase(); if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error("Código inválido (3–30 letras, números, - o _)");
  if (x.kind === "percentage" && (x.value < 1 || x.value > 100)) throw new Error("El porcentaje debe estar entre 1 y 100");
  if (x.kind === "fixed" && x.value < 1) throw new Error("El monto debe ser mayor a 0");
  if (x.endsAt && new Date(x.endsAt) <= new Date(x.startsAt)) throw new Error("La fecha de fin debe ser posterior al inicio");
  const d = db(); if (d.discounts.some((o) => o.code === code && o.id !== x.id)) throw new Error("Ya existe un descuento con ese código");
  logAudit(x.id ? "discount.update" : "discount.create", "discount", x.id || code, null, { code, kind: x.kind, value: x.value });
  if (!x.id) d.discounts.unshift({ ...x, code, id: nid("dsc") }); else d.discounts = d.discounts.map((o) => (o.id === x.id ? { ...x, code } : o));
}, { invalidate: [["discounts"]], success: "Descuento guardado" });
export const useDeleteDiscount = () => useAction((id: string) => { const d = db(); d.discounts = d.discounts.filter((x) => x.id !== id); }, { invalidate: [["discounts"]], success: "Descuento eliminado" });

/* ---------- Envíos e impuestos ---------- */
export const useZones = () => useMock(["zones"], () => db().zones);
export const useSaveZone = () => useAction((z: ShippingZone) => {
  if (!z.name.trim()) throw new Error("El nombre es obligatorio"); if (!z.departments.length) throw new Error("Selecciona al menos un departamento");
  if (z.rates.some((r) => !r.name.trim() || r.price < 0)) throw new Error("Revisa las tarifas: nombre obligatorio y precio ≥ 0");
  const d = db(); if (!z.id) d.zones.push({ ...z, id: nid("zn") }); else d.zones = d.zones.map((x) => (x.id === z.id ? z : x));
}, { invalidate: [["zones"]], success: "Zona guardada" });
export const useDeleteZone = () => useAction((id: string) => { const d = db(); d.zones = d.zones.filter((z) => z.id !== id); }, { invalidate: [["zones"]], success: "Zona eliminada" });
export const useTax = () => useMock(["tax"], () => ({ rate: db().taxRate, included: db().taxIncluded }));
export const useSaveTax = () => useAction((t: { rate: number; included: boolean }) => { if (t.rate < 0 || t.rate > 100) throw new Error("La tarifa debe estar entre 0 y 100"); db().taxRate = t.rate; db().taxIncluded = t.included; }, { invalidate: [["tax"]], success: "Impuestos guardados" });

/* ---------- Marketing ---------- */
export const useSubscribers = (status: string, q: string) => useMock(["subscribers", status, q], () => db().subscribers.filter((s) => (!status || s.status === status) && (!q || s.email.includes(q.toLowerCase()))));
export const useUnsubscribe = () => useAction((id: string) => { const s = db().subscribers.find((x) => x.id === id); if (s) s.status = "unsubscribed"; }, { invalidate: [["subscribers"]], success: "Suscriptor dado de baja" });
export const useMessages = (status: string) => useMock(["messages", status], () => db().messages.filter((m) => !status || m.status === status));
export const useSetMessageStatus = () => useAction(({ id, status }: { id: string; status: ContactMessage["status"] }) => { const m = db().messages.find((x) => x.id === id); if (m) m.status = status; }, { invalidate: [["messages"]], success: "Estado actualizado" });

/* ---------- Plantillas de correo ---------- */
export const useEmailTemplates = () => useMock(["emails"], () => db().emails);
export const useSaveEmail = () => useAction((t: EmailTemplate) => {
  const used = [...`${t.subject} ${t.html} ${t.text}`.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]); const bad = used.filter((v) => !t.variables.includes(v));
  if (bad.length) throw new Error(`Variables no permitidas: ${[...new Set(bad)].join(", ")}`);
  if (/<script/i.test(t.html)) throw new Error("El HTML no puede contener <script>");
  const d = db(); d.emails = d.emails.map((x) => (x.id === t.id ? t : x));
}, { invalidate: [["emails"]], success: "Plantilla guardada" });
export const useSendTest = () => useAction((v: { to: string }) => { if (!/^\S+@\S+\.\S+$/.test(v.to)) throw new Error("Correo inválido"); }, { success: "Correo de prueba enviado (simulado)" });

/* ---------- Equipo ---------- */
export const useStaff = () => useMock(["staff"], () => db().staff);
export const useRoles = () => useMock(["roles"], () => db().roles);
const genPass = () => `Dept-${randomToken(8)}-${randomToken(4)}!`;
export const useSaveStaff = () => useAction((s: Staff) => {
  if (!s.name.trim()) throw new Error("El nombre es obligatorio"); if (!/^\S+@\S+\.\S+$/.test(s.email)) throw new Error("Correo inválido");
  const email = s.email.trim().toLowerCase();
  const d = db(); if (d.staff.some((x) => x.email.toLowerCase() === email && x.id !== s.id)) throw new Error("Ya existe una persona con ese correo");
  if (!s.id) { const id = nid("stf"); d.staff.push({ ...s, email, id }); logAudit("staff.create", "staff", id, null, { email, role: s.role }); return { tempPassword: genPass() }; }
  d.staff = d.staff.map((x) => (x.id === s.id ? { ...s, email } : x)); logAudit("staff.update", "staff", s.id, null, { email, active: s.active }); return { tempPassword: null };
}, { invalidate: [["staff"]], success: "Personal guardado" });
export const useResetStaffPassword = () => useAction((id: string) => { logAudit("staff.reset-password", "staff", id, null, null); return { tempPassword: genPass() }; }, { success: "Contraseña temporal generada" });
export const useDeleteStaff = () => useAction((id: string) => { const d = db(); const s = d.staff.find((x) => x.id === id); if (s?.role === "owner") throw new Error("No se puede eliminar al propietario"); d.staff = d.staff.filter((x) => x.id !== id); }, { invalidate: [["staff"]], success: "Persona eliminada" });

/* ---------- Auditoría (cursor) ---------- */
export interface AuditFilters { actor: string; action: string; entity: string }
export const fetchAudit = (f: AuditFilters, cursor: number) => wait(() => {
  const all = db().audit.filter((a) => (!f.actor || a.actor.includes(f.actor)) && (!f.action || a.action.includes(f.action)) && (!f.entity || a.entity === f.entity));
  const next = cursor + 8;
  return { items: all.slice(cursor, next), nextCursor: next < all.length ? next : null };
});

/* ---------- Importador ---------- */
export function useImports() { return useQuery({ queryKey: ["imports"], queryFn: () => wait(() => db().imports.map((j) => ({ ...j }))), refetchInterval: (q) => (q.state.data?.some((j) => j.status === "running" || j.status === "queued") ? 800 : false) }); }
export const useStartImport = () => useAction(({ kind, file, rows, dryRun }: { kind: ImportJob["kind"]; file: string; rows: string[]; dryRun: boolean }) => {
  const header = rows[0]?.toLowerCase() ?? ""; const need = kind === "products" ? "title" : "email";
  if (!header.includes(need)) throw new Error(`El CSV debe tener una columna “${need}”`);
  const body = rows.slice(1).filter((r) => r.trim()); if (!body.length) throw new Error("El CSV no tiene filas");
  const errors = body.flatMap((r, i) => (r.split(",").some((c) => c.trim() === "") ? [{ row: i + 2, message: "Hay columnas vacías" }] : []));
  const job: ImportJob = { id: nid("imp"), kind, file, dryRun, status: "running", total: body.length, processed: 0, errors };
  const d = db(); d.imports.unshift(job);
  const t = setInterval(() => { if (job.status !== "running") return clearInterval(t); job.processed = Math.min(job.total, job.processed + Math.max(1, Math.ceil(job.total / 8))); if (job.processed >= job.total) { job.status = errors.length && !dryRun ? "failed" : "done"; clearInterval(t); } }, 700);
  return job;
}, { invalidate: [["imports"]], success: "Importación iniciada" });
export const useCancelImport = () => useAction((id: string) => { const j = db().imports.find((x) => x.id === id); if (j && j.status === "running") j.status = "cancelled"; }, { invalidate: [["imports"]], success: "Importación cancelada" });

/* ---------- Mantenimiento ---------- */
export const useMaintenanceRuns = () => useMock(["maintenance"], () => db().maintenance);
export const useRunMaintenance = () => useAction(() => { const r = { ranAt: now(), summary: "Se purgaron 12 sesiones expiradas, 3 tokens de vista previa y 0 carritos abandonados (>30 días). Índices reconstruidos." }; db().maintenance.unshift(r); return r; }, { invalidate: [["maintenance"]], success: "Mantenimiento ejecutado" });

/* ---------- Cuenta ---------- */
export const useRecoveryCodes = () => useAction(() => Array.from({ length: 8 }, () => `${randomToken(5)}-${randomToken(5)}`.toLowerCase()));
/** Secreto TOTP simulado, distinto en cada activación. */
export const newTotpSecret = (): string => randomToken(16);
