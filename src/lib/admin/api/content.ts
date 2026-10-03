"use client";
import { db, nid, now } from "../mock/db";
import { SECTION_TYPES } from "../mock/seed";
import { isSafePath, slugify } from "../format";
import { useAction, useMock } from "../query";
import type { ContentDoc, DocKind, JsonValue, Redirect, SchemaField, Section } from "../types";

/** Simula el planificador del servidor: publica los documentos cuya programación ya venció. */
function applyDueSchedules(): void {
  for (const d of db().content) {
    if (d.scheduledAt && new Date(d.scheduledAt).getTime() <= Date.now()) {
      d.version += 1; d.published = structuredClone(d.draft); d.dirty = false; d.scheduledAt = null; d.publishedAt = now();
      d.versions.unshift({ id: nid("ver"), number: d.version, at: now(), actor: "Programación", content: structuredClone(d.draft), label: "Publicado (programado)" });
    }
  }
}
export const useDocs = () => useMock(["docs"], () => { applyDueSchedules(); return db().content; });
export const useDoc = (kind: DocKind, key: string) => useMock(["doc", kind, key], () => { applyDueSchedules(); return db().content.find((d) => d.kind === kind && d.key === key) ?? null; });
export const useSectionTypes = () => useMock(["section-types"], () => SECTION_TYPES);
const find = (kind: DocKind, key: string): ContentDoc => { const d = db().content.find((x) => x.kind === kind && x.key === key); if (!d) throw new Error("Documento no encontrado"); return d; };
const inv = [["docs"], ["doc"]];

export const docStatus = (d: ContentDoc): "draft-unpublished" | "scheduled" | "dirty" | "published" =>
  d.scheduledAt ? "scheduled" : d.published === null ? "draft-unpublished" : d.dirty ? "dirty" : "published";

export const useSaveDraft = () => useAction(({ kind, key, draft, seoTitle, seoDescription }: { kind: DocKind; key: string; draft: JsonValue; seoTitle?: string; seoDescription?: string }) => {
  const d = find(kind, key); d.draft = draft; d.dirty = true; if (seoTitle !== undefined) d.seoTitle = seoTitle; if (seoDescription !== undefined) d.seoDescription = seoDescription;
}, { invalidate: inv });
export const useDiscard = () => useAction(({ kind, key }: { kind: DocKind; key: string }) => { const d = find(kind, key); if (d.published !== null) { d.draft = structuredClone(d.published); d.dirty = false; } }, { invalidate: inv, success: "Cambios descartados" });
export const usePublish = () => useAction(({ kind, key }: { kind: DocKind; key: string }) => {
  const d = find(kind, key); d.version += 1; d.published = structuredClone(d.draft); d.dirty = false; d.scheduledAt = null; d.publishedAt = now();
  d.versions.unshift({ id: nid("ver"), number: d.version, at: now(), actor: "owner@daregulardept.com", content: structuredClone(d.draft), label: "Publicado" });
}, { invalidate: inv, success: "Publicado. La tienda se actualizará en segundos." });
export const useSchedule = () => useAction(({ kind, key, at }: { kind: DocKind; key: string; at: string }) => { if (new Date(at).getTime() < Date.now() + 60_000) throw new Error("La fecha debe ser al menos 1 minuto en el futuro"); find(kind, key).scheduledAt = at; }, { invalidate: inv, success: "Publicación programada" });
export const useCancelSchedule = () => useAction(({ kind, key }: { kind: DocKind; key: string }) => { find(kind, key).scheduledAt = null; }, { invalidate: inv, success: "Programación cancelada" });
export const useRestoreVersion = () => useAction(({ kind, key, versionId }: { kind: DocKind; key: string; versionId: string }) => { const d = find(kind, key); const v = d.versions.find((x) => x.id === versionId); if (v) { d.draft = structuredClone(v.content); d.dirty = true; } }, { invalidate: inv, success: "Versión restaurada como borrador" });
export const useCreatePage = () => useAction(({ title, handle }: { title: string; handle: string }) => {
  const key = handle || slugify(title); if (!HANDLE.test(key)) throw new Error("Handle inválido (usa minúsculas, números y guiones)");
  if (db().content.some((d) => d.kind === "page" && d.key === key)) throw new Error("Ya existe una página con ese handle");
  db().content.push({ kind: "page", key, title, draft: { sections: [] }, published: null, version: 0, dirty: true, scheduledAt: null, publishedAt: null, versions: [], seoTitle: title, seoDescription: "" }); return key;
}, { invalidate: inv, success: "Página creada" });
export const useDeletePage = () => useAction((key: string) => { const d = db(); d.content = d.content.filter((x) => !(x.kind === "page" && x.key === key)); }, { invalidate: inv, success: "Página eliminada" });
export const usePreviewToken = () => useAction(async () => ({ token: `preview_${nid("tk")}`, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() }));

/* ---------- Validación de secciones según el catálogo ---------- */
export const HANDLE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
export const isSafeUrl = (v: string): boolean => (v.startsWith("/") ? isSafePath(v) : /^(https:\/\/|mailto:|tel:)/.test(v) && !/[\u0000-\u001f\u007f\\]/.test(v));
export function validateField(f: SchemaField, v: JsonValue | undefined): string | undefined {
  const empty = v === undefined || v === null || v === "";
  if (empty) return f.required ? "Obligatorio" : undefined;
  if (typeof v === "string") {
    if (f.max && v.length > f.max) return `Máximo ${f.max} caracteres`;
    if (f.type === "color" && !HEX.test(v)) return "Color hex inválido (#RRGGBB)";
    if ((f.type === "url" || f.type === "image") && !isSafeUrl(v) && !v.startsWith("data:image/")) return "Debe ser https://, /ruta, mailto: o tel:";
    if ((f.type === "collection" || f.type === "product") && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) return "Handle inválido";
  }
  if (typeof v === "number") { if (f.min !== undefined && v < f.min) return `Mínimo ${f.min}`; if (f.maxValue !== undefined && v > f.maxValue) return `Máximo ${f.maxValue}`; }
  if (f.type === "links" && Array.isArray(v)) for (const l of v) { const o = l as { label?: string; url?: string }; if (!o.label || !o.url || !isSafeUrl(o.url)) return "Cada enlace necesita texto y URL válida"; }
  return undefined;
}
export function validateSections(sections: Section[], types: { type: string; settings: SchemaField[]; blockTypes: { type: string; fields: SchemaField[] }[]; maxBlocks?: number }[]): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const s of sections) {
    const t = types.find((x) => x.type === s.type); if (!t) { errs[`${s.id}.type`] = "Tipo de sección desconocido"; continue; }
    for (const f of t.settings) { const e = validateField(f, s.settings[f.key]); if (e) errs[`${s.id}.settings.${f.key}`] = e; }
    if (t.maxBlocks && (s.blocks?.length ?? 0) > t.maxBlocks) errs[`${s.id}.blocks`] = `Máximo ${t.maxBlocks} bloques`;
    for (const b of s.blocks ?? []) { const bt = t.blockTypes.find((x) => x.type === b.type); for (const f of bt?.fields ?? []) { const e = validateField(f, b.settings[f.key]); if (e) errs[`${s.id}.blocks.${b.id}.${f.key}`] = e; } }
  }
  return errs;
}

/** Diferencias legibles (claves cambiadas) entre dos JSON. */
export function diffJson(a: JsonValue | null, b: JsonValue | null, path = ""): { path: string; before: string; after: string }[] {
  const show = (v: JsonValue | null | undefined) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const objA = a && typeof a === "object" && !Array.isArray(a), objB = b && typeof b === "object" && !Array.isArray(b);
  if (objA && objB) { const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]); return [...keys].flatMap((k) => diffJson((a as Record<string, JsonValue>)[k] ?? null, (b as Record<string, JsonValue>)[k] ?? null, path ? `${path}.${k}` : k)); }
  if (Array.isArray(a) && Array.isArray(b)) {
    const idOf = (x: JsonValue) => (x && typeof x === "object" && !Array.isArray(x) && typeof (x as Record<string, JsonValue>).id === "string" ? String((x as Record<string, JsonValue>).id) : null);
    if (a.every((x) => idOf(x)) && b.every((x) => idOf(x))) {
      const ids = new Set([...a.map((x) => idOf(x)!), ...b.map((x) => idOf(x)!)]);
      const out = [...ids].flatMap((id) => { const x = a.find((y) => idOf(y) === id), y = b.find((z) => idOf(z) === id); return !x ? [{ path: `${path}[${id}]`, before: "—", after: "añadido" }] : !y ? [{ path: `${path}[${id}]`, before: "eliminado", after: "—" }] : diffJson(x, y, `${path}[${id}]`); });
      const order = (l: JsonValue[]) => l.map((x) => idOf(x)).join(",");
      return order(a) !== order(b) && !out.length ? [{ path: `${path} (orden)`, before: order(a), after: order(b) }] : out;
    }
  }
  return [{ path, before: show(a), after: show(b) }];
}

/* ---------- Redirecciones ---------- */
export const useRedirects = () => useMock(["redirects"], () => db().redirects);
export const useSaveRedirect = () => useAction((r: Redirect) => {
  const d = db(); const from = r.from.trim(), to = r.to.trim();
  if (!isSafePath(from)) throw new Error("El origen debe ser una ruta que empiece con / (sin \\ ni caracteres de control)"); if (!(isSafePath(to) || (to.startsWith("https://") && isSafeUrl(to)))) throw new Error("El destino debe ser /ruta o https://");
  if (from === to) throw new Error("El origen y el destino no pueden ser iguales");
  if (d.redirects.some((x) => x.from === from && x.id !== r.id)) throw new Error("Ya existe una redirección desde ese origen");
  let cur = to, hops = 0; while (hops++ < 10) { const nx = d.redirects.find((x) => x.from === cur && x.id !== r.id); if (!nx) break; if (nx.to === from || nx.from === from) throw new Error("Esta redirección crearía un bucle"); cur = nx.to; }
  if (cur === from) throw new Error("Esta redirección crearía un bucle");
  if (!r.id) d.redirects.push({ ...r, from, to, id: nid("rd"), hits: 0 }); else d.redirects = d.redirects.map((x) => (x.id === r.id ? { ...r, from, to } : x));
}, { invalidate: [["redirects"]], success: "Redirección guardada" });
export const useDeleteRedirect = () => useAction((id: string) => { const d = db(); d.redirects = d.redirects.filter((r) => r.id !== id); }, { invalidate: [["redirects"]], success: "Redirección eliminada" });
