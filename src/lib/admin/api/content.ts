"use client";
/**
 * CMS (contenido) contra `/admin/content/*` y `/admin/redirects`.
 * Los tipos de sección y sus campos salen del JSON Schema del backend (`GET /admin/content/section-types`):
 * el editor ofrece exactamente los campos que el servidor valida y la tienda renderiza.
 */
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { useAction, useApi } from "../query";
import type { DocKind, JsonValue, Section } from "../types";

/* ======================================================================= *
 *  Tipos de pantalla
 * ======================================================================= */
export type { DocKind, JsonValue, Section };

export interface CmsDoc {
  id: string;
  kind: DocKind;
  key: string;
  title: string;
  /** Versión del documento (bloqueo optimista: se envía en cada guardado de borrador). */
  version: number;
  /** Solo en el detalle (en el listado es `null`). */
  draft: JsonValue | null;
  /** Hay cambios sin publicar (borrador distinto de lo publicado, o nunca publicado). */
  dirty: boolean;
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishedNumber: number | null;
  /** Primera programación pendiente. */
  scheduledAt: string | null;
  scheduled: { versionId: string; number: number; publishAt: string }[];
  draftUpdatedAt: string;
}
export interface CmsVersion {
  id: string;
  number: number;
  status: "published" | "scheduled" | "superseded" | "cancelled";
  publishAt: string | null;
  publishedAt: string | null;
  note: string | null;
  authorId: string | null;
  createdAt: string;
}
export interface CmsVersionDetail extends CmsVersion { data: JsonValue }

export type CmsFieldType = "string" | "text" | "markdown" | "number" | "boolean" | "enum" | "image" | "color" | "url" | "collection" | "product" | "menu" | "links" | "stringList";
export interface CmsField {
  key: string;
  label: string;
  type: CmsFieldType;
  options?: string[];
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  pattern?: string;
  required?: boolean;
  hint?: string;
  default?: JsonValue;
  /** `stringList` / `links`: máximo de elementos y de caracteres por elemento. */
  maxItems?: number;
  itemMaxLength?: number;
}
export interface CmsBlockType { type: string; label: string; fields: CmsField[] }
export interface CmsSectionType { type: string; label: string; settings: CmsField[]; blockTypes: CmsBlockType[]; maxBlocks?: number }

export interface CmsRedirect { id: string; fromPath: string; toPath: string; statusCode: 301 | 302; isActive: boolean; createdAt: string; updatedAt: string }
interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; totalPages: number }

/* ======================================================================= *
 *  Utilidades de validación (alineadas con src/cms/schemas/common.ts del backend)
 * ======================================================================= */
export const HANDLE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Id de nodo (sección/bloque/ítem de menú): el backend exige ^[a-z0-9-]{3,40}$. */
export const nodeId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function isSafeUrl(v: string, allowMailTel = true): boolean {
  if (!v || v.length > 2000 || /[\u0000- \u007f]/.test(v)) return false;
  if (v.startsWith("/")) return !v.startsWith("//") && !v.includes("\\");
  if (v.startsWith("https://")) { try { return new URL(v).protocol === "https:"; } catch { return false; } }
  return allowMailTel && (/^mailto:[^\s@]+@[^\s@]+$/.test(v) || /^tel:\+?[0-9()\-.]{3,30}$/.test(v));
}

const empty = (v: JsonValue | undefined): boolean => v === undefined || v === null || v === "";
export function validateField(f: CmsField, v: JsonValue | undefined): string | undefined {
  if (empty(v)) return f.required && f.default === undefined ? "Obligatorio" : undefined;
  if (f.type === "stringList") {
    if (!Array.isArray(v)) return "Lista inválida";
    if (f.maxItems && v.length > f.maxItems) return `Máximo ${f.maxItems} elementos`;
    for (const x of v) { if (typeof x !== "string" || !x.trim()) return "Hay líneas vacías"; if (f.itemMaxLength && x.length > f.itemMaxLength) return `Cada línea admite máximo ${f.itemMaxLength} caracteres`; }
    return undefined;
  }
  if (f.type === "links") {
    if (!Array.isArray(v)) return "Lista inválida";
    if (f.maxItems && v.length > f.maxItems) return `Máximo ${f.maxItems} enlaces`;
    for (const l of v) { const o = l as { label?: string; url?: string }; if (!o.label?.trim() || !o.url || !isSafeUrl(o.url)) return "Cada enlace necesita texto y URL válida (https://, /ruta, mailto: o tel:)"; }
    return undefined;
  }
  if (typeof v === "string") {
    if (f.maxLength && v.length > f.maxLength) return `Máximo ${f.maxLength} caracteres`;
    if (f.minLength && v.length < f.minLength) return `Mínimo ${f.minLength} caracteres`;
    if (f.type === "color" && !HEX.test(v)) return "Color hex inválido (#RRGGBB)";
    if (f.type === "image" && !isSafeUrl(v, false)) return "Debe ser https:// o /ruta";
    if (f.type === "url" && !isSafeUrl(v)) return "Debe ser https://, /ruta, mailto: o tel:";
    if (f.type === "markdown") { if (/<[a-zA-Z/!?]/.test(v)) return "HTML no permitido: usa solo Markdown"; }
    if (f.pattern && f.type !== "color" && !new RegExp(f.pattern).test(v)) return f.type === "collection" || f.type === "product" || f.type === "menu" ? "Handle inválido (minúsculas, números y guiones)" : "Formato inválido";
  }
  if (typeof v === "number") {
    if (f.integer && !Number.isInteger(v)) return "Debe ser un entero";
    if (f.min !== undefined && v < f.min) return `Mínimo ${f.min}`;
    if (f.max !== undefined && v > f.max) return `Máximo ${f.max}`;
  }
  return undefined;
}

export function validateSections(sections: Section[], types: CmsSectionType[]): Record<string, string> {
  const errs: Record<string, string> = {};
  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id)) errs[`${s.id}.id`] = "Id de sección duplicado"; seen.add(s.id);
    const t = types.find((x) => x.type === s.type);
    if (!t) { errs[`${s.id}.type`] = "Tipo de sección desconocido"; continue; }
    for (const f of t.settings) { const e = validateField(f, s.settings[f.key]); if (e) errs[`${s.id}.settings.${f.key}`] = e; }
    if (t.maxBlocks && (s.blocks?.length ?? 0) > t.maxBlocks) errs[`${s.id}.blocks`] = `Máximo ${t.maxBlocks} bloques`;
    for (const b of s.blocks ?? []) {
      const bt = t.blockTypes.find((x) => x.type === b.type);
      if (!bt) { errs[`${s.id}.blocks.${b.id}.type`] = `Bloque “${b.type}” no permitido`; continue; }
      for (const f of bt.fields) { const e = validateField(f, b.settings[f.key]); if (e) errs[`${s.id}.blocks.${b.id}.${f.key}`] = e; }
      // Regla del backend: un mosaico necesita colección o enlace.
      if (s.type === "split-banner" && b.type === "tile" && empty(b.settings.collectionHandle) && empty(b.settings.href)) errs[`${s.id}.blocks.${b.id}.collectionHandle`] = "Indica una colección o un enlace";
    }
  }
  return errs;
}

/** Elimina `""`, `null` y `undefined` (el backend es estricto: un opcional vacío no es válido). */
export function prune(v: JsonValue | undefined): JsonValue | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v.map((x) => prune(x) ?? x) as JsonValue;
  if (typeof v === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [k, x] of Object.entries(v)) { const p = prune(x); if (p !== undefined) out[k] = p; }
    return out;
  }
  return v;
}

/* ======================================================================= *
 *  JSON Schema (backend) → campos del formulario
 * ======================================================================= */
interface JsProp {
  type?: string; enum?: string[]; maxLength?: number; minLength?: number; pattern?: string; minimum?: number; maximum?: number;
  default?: JsonValue; items?: JsProp & { properties?: Record<string, JsProp> }; maxItems?: number; description?: string;
}
interface JsObject { properties?: Record<string, JsProp>; required?: string[] }
interface SectionTypeDto { type: string; label: string; settingsSchema: JsObject; blockTypes: { type: string; label: string; schema: JsObject }[] }

const LABELS: Record<string, string> = {
  eyebrow: "Sobretítulo", heading: "Titular", headingAccent: "Acento del titular", headingOutline: "Titular (línea contorneada)", subheading: "Subtítulo", lede: "Entradilla", lead: "Línea destacada", text: "Texto", body: "Contenido (Markdown)",
  imageUrl: "Imagen", imageAlt: "Texto alternativo de la imagen", mobileImageUrl: "Imagen para móvil", imageBadge: "Etiqueta sobre la imagen", imagePosition: "Posición de la imagen", alt: "Texto alternativo", caption: "Pie de foto",
  ctaLabel: "Botón: texto", ctaHref: "Botón: enlace", ctaVariant: "Botón: estilo", secondaryCtaLabel: "Botón secundario: texto", secondaryCtaHref: "Botón secundario: enlace", secondaryCtaVariant: "Botón secundario: estilo",
  backgroundColor: "Color de fondo", textColor: "Color del texto", overlayColor: "Color de la capa", overlayOpacity: "Opacidad de la capa (0-1)", separatorColor: "Color del separador", separator: "Separador",
  alignment: "Alineación", height: "Altura", layout: "Disposición", columns: "Columnas", limit: "Máximo de productos", maxWidth: "Ancho máximo", size: "Tamaño", speed: "Velocidad", duration: "Segundos por vuelta", variant: "Variante",
  collectionHandle: "Colección", productHandle: "Producto", menuKey: "Menú", href: "Enlace", url: "URL", label: "Texto", title: "Título", icon: "Icono", ariaLabel: "Etiqueta accesible", anchorId: "Id de ancla", scrollTargetId: "Ancla de destino del scroll", scrollLabel: "Texto del indicador de scroll",
  showCount: "Mostrar contador", countLabel: "Etiqueta del contador", dismissible: "Se puede cerrar", items: "Líneas (marquesina)", links: "Enlaces", kenBurns: "Zoom lento (Ken Burns)", parallax: "Parallax", grayscale: "Escala de grises", numbered: "Numerar mosaicos",
  placeholder: "Marcador del campo", buttonLabel: "Texto del botón", inputLabel: "Etiqueta del campo", successMessage: "Mensaje de éxito", errorMessage: "Mensaje de error", loadingMessage: "Mensaje de carga",
  code: "Código", copyright: "Copyright", wordmark: "Marca gigante", brandTitle: "Titular de marca", brandText: "Texto de marca", bottomText: "Texto inferior", backToTopLabel: "Texto «volver arriba»",
};
const humanize = (k: string): string => { const s = k.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ").toLowerCase().trim(); return s[0].toUpperCase() + s.slice(1); };
const HINTS: Record<string, string> = { heading: "Un renglón por línea (Enter para separar)", scrollTargetId: "Id de otra sección (sin #)", anchorId: "Para enlazar a esta sección (#id)", noResultsTitle: "{query} se reemplaza por lo que escribió el visitante" };
const HANDLE_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

function toField(key: string, p: JsProp, required: boolean): CmsField {
  const f: CmsField = { key, label: LABELS[key] ?? humanize(key), type: "string", required, default: p.default, hint: HINTS[key] ?? p.description };
  if (p.maxLength) f.maxLength = p.maxLength;
  if (p.minLength) f.minLength = p.minLength;
  if (p.pattern) f.pattern = p.pattern;
  if (p.minimum !== undefined) f.min = p.minimum;
  if (p.maximum !== undefined) f.max = p.maximum;
  if (p.type === "boolean") return { ...f, type: "boolean" };
  if (p.type === "number" || p.type === "integer") return { ...f, type: "number", integer: p.type === "integer" };
  if (p.enum) return { ...f, type: "enum", options: p.enum.map(String) };
  if (p.type === "array") {
    f.maxItems = p.maxItems;
    if (p.items?.type === "object") return { ...f, type: "links" };
    return { ...f, type: "stringList", itemMaxLength: p.items?.maxLength };
  }
  if (p.pattern === "^#[0-9a-fA-F]{6}$") return { ...f, type: "color" };
  if (p.pattern === HANDLE_PATTERN) {
    if (/collectionhandle$/i.test(key)) return { ...f, type: "collection" };
    if (/producthandle$/i.test(key)) return { ...f, type: "product" };
    if (key === "menuKey") return { ...f, type: "menu" };
    return f;
  }
  if (/Url$/.test(key) && !p.maxLength) return { ...f, type: "image" };
  if (/^(href|url)$/i.test(key) || /Href$/.test(key)) return { ...f, type: "url" };
  if (key === "body" && (p.maxLength ?? 0) >= 1000) return { ...f, type: "markdown" };
  if (key === "heading" || (p.maxLength ?? 0) >= 150) return { ...f, type: "text" };
  return f;
}
const fieldsOf = (s: JsObject): CmsField[] => Object.entries(s.properties ?? {}).map(([k, p]) => toField(k, p, (s.required ?? []).includes(k)));
/** Máximo de bloques: lo conoce el servidor al validar, no el JSON Schema; se tabula aquí con el mismo valor del registro del backend. */
const MAX_BLOCKS: Record<string, number> = { marquee: 20, "split-banner": 4, "value-props": 8, lookbook: 24, footer: 6, "collection-hero": 8, "search-panel": 8 };
export const adaptSectionTypes = (dto: SectionTypeDto[]): CmsSectionType[] =>
  dto.map((t) => ({ type: t.type, label: t.label, settings: fieldsOf(t.settingsSchema), blockTypes: t.blockTypes.map((b) => ({ type: b.type, label: b.label, fields: fieldsOf(b.schema) })), maxBlocks: MAX_BLOCKS[t.type] }));

/** Valores iniciales de un formulario: los `default` del esquema y `""` en textos obligatorios sin valor por defecto. */
export function initialValues(fields: CmsField[]): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const f of fields) {
    if (f.default !== undefined) out[f.key] = f.default;
    else if (f.required && (f.type === "string" || f.type === "text" || f.type === "markdown" || f.type === "url" || f.type === "image")) out[f.key] = "";
  }
  return out;
}

/* ======================================================================= *
 *  Documentos
 * ======================================================================= */
interface DocListDto { id: string; kind: DocKind; key: string; title: string | null; version: number; hasUnpublishedChanges: boolean; publishedAt: string | null; scheduledAt: string | null; draftUpdatedAt: string }
interface DocDetailDto {
  id: string; kind: DocKind; key: string; title: string | null; version: number; draft: JsonValue; draftUpdatedAt: string; hasUnpublishedChanges: boolean;
  published: { versionId: string; number: number; publishedAt: string | null } | null; scheduled: { versionId: string; number: number; publishAt: string | null }[];
}
const fromList = (d: DocListDto): CmsDoc => ({ id: d.id, kind: d.kind, key: d.key, title: d.title ?? d.key, version: d.version, draft: null, dirty: d.hasUnpublishedChanges, publishedAt: d.publishedAt, publishedVersionId: null, publishedNumber: null, scheduledAt: d.scheduledAt, scheduled: [], draftUpdatedAt: d.draftUpdatedAt });
const fromDetail = (d: DocDetailDto): CmsDoc => ({
  id: d.id, kind: d.kind, key: d.key, title: d.title ?? (d.draft as { title?: string } | null)?.title ?? d.key, version: d.version, draft: d.draft, dirty: d.hasUnpublishedChanges,
  publishedAt: d.published?.publishedAt ?? null, publishedVersionId: d.published?.versionId ?? null, publishedNumber: d.published?.number ?? null,
  scheduledAt: d.scheduled[0]?.publishAt ?? null, scheduled: d.scheduled.filter((s): s is { versionId: string; number: number; publishAt: string } => !!s.publishAt), draftUpdatedAt: d.draftUpdatedAt,
});
const docPath = (kind: DocKind, key: string): string => `/admin/content/documents/${kind}/${encodeURIComponent(key)}`;
const docKey = (kind: DocKind, key: string) => ["doc", kind, key] as const;
/** Escribe el detalle devuelto por el servidor en la caché (sin refetch) y refresca los listados. */
const putDoc = (qc: QueryClient, d: DocDetailDto): CmsDoc => { qc.setQueryData([...docKey(d.kind, d.key), null], d); void qc.invalidateQueries({ queryKey: ["docs"] }); return fromDetail(d); };

export const useDocs = () => useApi<DocListDto[], CmsDoc[]>(["docs"], "/admin/content/documents", { select: (l) => l.map(fromList), staleTime: 5_000 });
export const useDoc = (kind: DocKind, key: string) => useApi<DocDetailDto, CmsDoc>(docKey(kind, key), docPath(kind, key), { select: fromDetail, staleTime: 5_000 });
export const useSectionTypes = () => useApi<SectionTypeDto[], CmsSectionType[]>(["section-types"], "/admin/content/section-types", { select: adaptSectionTypes, staleTime: 10 * 60_000 });

export const docStatus = (d: Pick<CmsDoc, "scheduledAt" | "publishedAt" | "dirty">): "draft-unpublished" | "scheduled" | "dirty" | "published" =>
  d.scheduledAt ? "scheduled" : d.publishedAt === null ? "draft-unpublished" : d.dirty ? "dirty" : "published";

export const saveDraft = async (qc: QueryClient, a: { kind: DocKind; key: string; draft: JsonValue; version: number }): Promise<CmsDoc> =>
  putDoc(qc, await api.put<DocDetailDto>(docPath(a.kind, a.key), { data: prune(a.draft) ?? {}, version: a.version }));

type Ref = { kind: DocKind; key: string };
export function useDiscard() {
  const qc = useQueryClient();
  return useAction(async ({ kind, key }: Ref) => putDoc(qc, await api.post<DocDetailDto>(`${docPath(kind, key)}/discard`)), { success: "Cambios descartados" });
}
export function usePublish() {
  const qc = useQueryClient();
  return useAction(async ({ kind, key, note }: Ref & { note?: string }) => {
    const d = await api.post<DocDetailDto>(`${docPath(kind, key)}/publish`, note?.trim() ? { note: note.trim() } : {});
    void qc.invalidateQueries({ queryKey: ["doc-versions"] });
    return putDoc(qc, d);
  }, { success: "Publicado. La tienda se actualizará en segundos." });
}
export function useSchedule() {
  const qc = useQueryClient();
  return useAction(async ({ kind, key, at, note }: Ref & { at: string; note?: string }) => {
    await api.post(`${docPath(kind, key)}/schedule`, { publishAt: new Date(at).toISOString(), ...(note?.trim() ? { note: note.trim() } : {}) });
    await qc.invalidateQueries({ queryKey: docKey(kind, key) }); void qc.invalidateQueries({ queryKey: ["doc-versions"] }); void qc.invalidateQueries({ queryKey: ["docs"] });
  }, { success: "Publicación programada" });
}
export function useCancelSchedule() {
  const qc = useQueryClient();
  return useAction(async ({ kind, key, versionId }: Ref & { versionId: string }) => {
    await api.delete(`${docPath(kind, key)}/schedule/${versionId}`);
    await qc.invalidateQueries({ queryKey: docKey(kind, key) }); void qc.invalidateQueries({ queryKey: ["doc-versions"] }); void qc.invalidateQueries({ queryKey: ["docs"] });
  }, { success: "Programación cancelada" });
}
export function useRestoreVersion() {
  const qc = useQueryClient();
  return useAction(async ({ kind, key, versionId }: Ref & { versionId: string }) => putDoc(qc, await api.post<DocDetailDto>(`${docPath(kind, key)}/versions/${versionId}/restore`)), { success: "Versión restaurada como borrador" });
}
export const useVersions = (kind: DocKind, key: string, page: number, enabled = true) =>
  useApi<Paged<CmsVersion>>(["doc-versions", kind, key], `${docPath(kind, key)}/versions`, { query: { page, pageSize: 10 }, enabled, staleTime: 0 });
export const useVersion = (kind: DocKind, key: string, versionId: string | null) =>
  useApi<CmsVersionDetail>(["doc-version", kind, key, versionId], versionId ? `${docPath(kind, key)}/versions/${versionId}` : null, { staleTime: 60_000 });

export function useCreatePage() {
  const qc = useQueryClient();
  return useAction(async ({ title, handle }: { title: string; handle: string }) => {
    if (!HANDLE.test(handle)) throw new Error("Handle inválido (usa minúsculas, números y guiones)");
    const d = await api.post<DocDetailDto>("/admin/content/pages", { handle, title: title.trim() });
    putDoc(qc, d);
    return d.key;
  }, { success: "Página creada" });
}
export const useDeletePage = () =>
  useAction(async (key: string) => api.delete<{ deleted: true; suggestedRedirect: { fromPath: string; toPath: string } }>(docPath("page", key)), { invalidate: [["docs"]], success: "Página eliminada" });
export const usePreviewToken = (kind: DocKind, key: string) =>
  useQuery({ queryKey: ["preview-token", kind, key], queryFn: () => api.post<{ token: string; url: string; expiresAt: string }>("/admin/content/preview-tokens", { kind, key }), staleTime: 25 * 60_000, retry: false });

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

/* ======================================================================= *
 *  Redirecciones
 * ======================================================================= */
export const useRedirects = (page: number, q: string) => useApi<Paged<CmsRedirect>>(["redirects"], "/admin/redirects", { query: { page, pageSize: 25, q: q || undefined }, staleTime: 0 });
export type RedirectInput = { id?: string; fromPath: string; toPath: string; statusCode: 301 | 302; isActive: boolean };
export const useSaveRedirect = () =>
  useAction(async ({ id, ...body }: RedirectInput) => (id ? api.patch<CmsRedirect>(`/admin/redirects/${id}`, body) : api.post<CmsRedirect>("/admin/redirects", body)), { invalidate: [["redirects"]], success: "Redirección guardada" });
export const useDeleteRedirect = () => useAction(async (id: string) => api.delete(`/admin/redirects/${id}`), { invalidate: [["redirects"]], success: "Redirección eliminada" });
