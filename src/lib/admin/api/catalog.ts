"use client";
/**
 * Catálogo del panel contra la API real: productos, colecciones, inventario y ubicaciones.
 * Rutas: /admin/products, /admin/collections, /admin/inventory, /admin/locations (+ metafields).
 * Los precios son enteros en COP (sin decimales). El detalle del producto NO incluye stock: se gestiona en Inventario.
 */
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { ApiError, errorMessage } from "../errors";
import { LOW_STOCK_THRESHOLD, slugify, uid } from "../format";
import { useAction, useApi } from "../query";
import type { Page, ProductStatus } from "../types";
import { mediaUrl, storedMediaUrl } from "./media";

/* ====================================================================================================
 * DTOs de la API (solo lo que usa el panel)
 * ================================================================================================== */
interface ApiMedia { id: string; url: string; alt: string | null }
interface ApiOptionValue { id: string; value: string; position: number }
interface ApiOption { id: string; name: string; position: number; values: ApiOptionValue[] }
/** `version` solo llega en las respuestas de POST/PATCH de variantes: el detalle del producto NO la incluye. */
interface ApiVariant { id: string; sku: string | null; title: string; price: number; compareAtPrice: number | null; weightGrams: number | null; barcode: string | null; position: number; trackInventory: boolean; allowBackorder: boolean; optionValueIds: string[]; isActive: boolean; version?: number }
interface ApiProduct { id: string; handle: string; title: string; descriptionHtml: string; status: ProductStatus; vendor: string | null; productType: string | null; tags: string[]; seoTitle: string | null; seoDescription: string | null; publishedAt: string | null; options: ApiOption[]; variants: ApiVariant[]; media: ApiMedia[]; updatedAt: string; version: number }
interface ApiProductItem { id: string; handle: string; title: string; status: ProductStatus; variantCount: number; inventoryTotal: number | null; minPrice: number | null; maxPrice: number | null; primaryImage: ApiMedia | null }
interface ApiMetafield { namespace: string; key: string; type: string; value: string }
interface ApiCollection { id: string; handle: string; title: string; descriptionHtml: string; type: "manual" | "smart"; rules: { match: "all" | "any"; conditions: { field: string; op: string; value: string | number }[] } | null; sortOrder: string; isPublished: boolean; seoTitle: string | null; seoDescription: string | null; imageMediaId: string | null; updatedAt: string }

/* ====================================================================================================
 * Modelos de pantalla
 * ================================================================================================== */
export interface ProductListItem { id: string; handle: string; title: string; status: ProductStatus; variantCount: number; inventoryTotal: number; minPrice: number | null; image: { url: string; alt: string } | null }
/** Versión mínima (id/handle/título/imagen) para selectores y menús del panel. */
export interface ProductLite { id: string; handle: string; title: string; image: string }
export interface MetafieldForm { namespace: string; key: string; type: string; value: string; saved: boolean }
export interface VariantForm {
  id: string; title: string; options: string[]; optionValueIds: string[]; price: number; compareAt?: number; sku: string;
  weight?: number; barcode: string; tracked: boolean; backorder: boolean; active: boolean; isNew?: boolean;
}
export interface ProductForm {
  id: string; version: number; handle: string; title: string; description: string; status: ProductStatus; vendor: string; type: string; tags: string[];
  seoTitle: string; seoDescription: string; options: { name: string; values: string[] }[]; variants: VariantForm[];
  images: { id: string; url: string; alt: string }[]; metafields: MetafieldForm[]; updatedAt: string;
  /** Ids de los valores de opción persistidos: clave `${opción}\u0000${valor}`. */
  valueIds: Record<string, string>;
}
export const METAFIELD_TYPES: Record<string, string> = { single_line_text: "Texto", multi_line_text: "Texto largo", number_integer: "Entero", number_decimal: "Decimal", boolean: "Sí/No", json: "JSON", url: "URL", color: "Color" };
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const META_KEY = /^[a-z0-9_-]+$/i;
const vkey = (name: string, value: string) => `${name}\u0000${value}`;
const TYPE_LABEL_DEFAULT = "Predeterminado";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Umbral de "stock bajo" (valor por defecto del backend). */
export { LOW_STOCK_THRESHOLD };

/* ====================================================================================================
 * Productos: lectura
 * ================================================================================================== */
export interface ProductFilters { q: string; status: string; tag: string; vendor: string; page: number }
const PAGE = 20;
export const useProducts = (f: ProductFilters) =>
  useApi<Page<ApiProductItem>, Page<ProductListItem>>(["products"], "/admin/products", {
    query: { page: f.page, pageSize: PAGE, q: f.q.trim(), status: f.status, tag: f.tag.trim(), vendor: f.vendor.trim() },
    select: (d) => ({ ...d, items: d.items.map((p) => ({ id: p.id, handle: p.handle, title: p.title, status: p.status, variantCount: p.variantCount, inventoryTotal: p.inventoryTotal ?? 0, minPrice: p.minPrice, image: p.primaryImage ? { url: mediaUrl(p.primaryImage.url), alt: p.primaryImage.alt ?? "" } : null })) }),
  });

/** Recorre TODAS las páginas de un listado (de 100 en 100; `max` es solo una salvaguarda). */
async function fetchAll<T>(path: string, max = 100, query?: Record<string, string | number | undefined>): Promise<{ items: T[]; total: number }> {
  const out: T[] = [];
  let total = 0;
  for (let page = 1; page <= max; page++) {
    const r = await api.get<Page<T>>(path, { query: { ...query, page, pageSize: 100 } });
    out.push(...r.items);
    total = r.total;
    if (page >= r.totalPages) break;
  }
  return { items: out, total };
}
const lite = (p: { id: string; handle: string; title: string; image?: { url: string } | null }): ProductLite => ({ id: p.id, handle: p.handle, title: p.title, image: p.image?.url ? mediaUrl(p.image.url) : "" });

export interface ProductSearchResult { items: ProductLite[]; total: number }
/** Búsqueda EN EL SERVIDOR (título, handle o SKU): `q` vacío devuelve los primeros resultados. Los selectores muestran "N de M". */
export const useProductSearch = (q: string, opts: { allowEmpty?: boolean; pageSize?: number; enabled?: boolean } = {}) => {
  const term = q.trim();
  return useQuery({
    queryKey: ["product-search", term, opts.pageSize ?? 8], enabled: (opts.enabled ?? true) && (opts.allowEmpty || term.length > 0), placeholderData: keepPreviousData, staleTime: 15_000,
    queryFn: async (): Promise<ProductSearchResult> => {
      const r = await api.get<Page<ApiProductItem>>("/admin/products", { query: { q: term, pageSize: opts.pageSize ?? 8 } });
      return { items: r.items.map((p) => lite({ ...p, image: p.primaryImage })), total: r.total };
    },
  });
};
/** Resuelve un producto por su handle exacto (la búsqueda del servidor también compara el handle). `undefined` = comprobando; `null` = no existe. */
export const useProductByHandle = (handle: string) =>
  useQuery({
    queryKey: ["product-handle", handle], enabled: !!handle.trim(), staleTime: 30_000, retry: 1,
    queryFn: async (): Promise<ProductLite | null> => {
      const r = await api.get<Page<ApiProductItem>>("/admin/products", { query: { q: handle.trim(), pageSize: 25 } });
      const p = r.items.find((x) => x.handle === handle.trim());
      return p ? lite({ ...p, image: p.primaryImage }) : null;
    },
  });

function mapVariant(v: ApiVariant, opts: ApiOption[]): VariantForm {
  return {
    id: v.id, title: v.title, optionValueIds: v.optionValueIds, options: opts.map((o) => o.values.find((x) => v.optionValueIds.includes(x.id))?.value ?? ""),
    price: v.price, compareAt: v.compareAtPrice ?? undefined, sku: v.sku ?? "", weight: v.weightGrams ?? undefined, barcode: v.barcode ?? "",
    tracked: v.trackInventory, backorder: v.allowBackorder, active: v.isActive,
  };
}
const mapMetafield = (m: ApiMetafield): MetafieldForm => ({ namespace: m.namespace, key: m.key, type: m.type, value: m.value, saved: true });
function fromApi(d: ApiProduct, metafields: ApiMetafield[]): ProductForm {
  const opts = [...d.options].sort((a, b) => a.position - b.position).map((o) => ({ ...o, values: [...o.values].sort((a, b) => a.position - b.position) }));
  const valueIds: Record<string, string> = {};
  for (const o of opts) for (const v of o.values) valueIds[vkey(o.name, v.value)] = v.id;
  return {
    id: d.id, version: d.version, handle: d.handle, title: d.title, description: d.descriptionHtml, status: d.status, vendor: d.vendor ?? "", type: d.productType ?? "", tags: d.tags,
    seoTitle: d.seoTitle ?? "", seoDescription: d.seoDescription ?? "", options: opts.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
    variants: [...d.variants].sort((a, b) => a.position - b.position).filter((v) => v.isActive).map((v) => mapVariant(v, opts)),
    images: d.media.map((m) => ({ id: m.id, url: mediaUrl(m.url), alt: m.alt ?? "" })), metafields: metafields.map(mapMetafield), updatedAt: d.updatedAt, valueIds,
  };
}
export async function loadProduct(id: string): Promise<ProductForm> {
  const [d, m] = await Promise.all([api.get<ApiProduct>(`/admin/products/${id}`), api.get<{ metafields: ApiMetafield[] }>(`/admin/products/${id}/metafields`)]);
  return fromApi(d, m.metafields);
}
/** `null` si el producto no existe (404). */
export const useProduct = (id: string) =>
  useQuery({ queryKey: ["product", id], queryFn: async () => { try { return await loadProduct(id); } catch (e) { if (e instanceof ApiError && (e.status === 404 || e.code === "VALIDATION_ERROR")) return null; throw e; } } });

export const blankProduct = (): ProductForm => ({
  id: "", version: 0, handle: "", title: "", description: "", status: "draft", vendor: "Daregular Dept.", type: "", tags: [], seoTitle: "", seoDescription: "", options: [],
  variants: [{ id: `new-${uid()}`, isNew: true, title: TYPE_LABEL_DEFAULT, options: [], optionValueIds: [], price: 0, sku: "", barcode: "", tracked: true, backorder: false, active: true }],
  images: [], metafields: [], updatedAt: "", valueIds: {},
});

/** Genera el producto cartesiano de las opciones conservando precio/SKU de variantes existentes. */
export function generateVariants(options: ProductForm["options"], prev: VariantForm[], base: VariantForm | undefined): VariantForm[] {
  const opts = options.filter((o) => o.name.trim() && o.values.length);
  if (!opts.length) return prev.length ? [{ ...prev[0], options: [], optionValueIds: [], title: TYPE_LABEL_DEFAULT }] : [];
  const combos = opts.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
  const sameCount = combos.length === prev.length;
  return combos.map((c, i) => {
    const title = c.join(" / ");
    // si solo se renombró un valor (misma cantidad de combinaciones) se conservan precio, SKU y datos de esa posición
    const renamed = sameCount && prev[i] && !prev.some((v) => v.title === title) ? { ...prev[i], title, options: c } : undefined;
    const sku = base?.sku ? `${base.sku.replace(/-[^-]*$/, "")}-${c.join("").toUpperCase().replace(/[^A-Z0-9]/g, "")}` : "";
    return prev.find((v) => v.title === title) ?? renamed ?? { id: `new-${uid()}`, isNew: true, title, options: c, optionValueIds: [], price: base?.price ?? 0, compareAt: base?.compareAt, sku, weight: base?.weight, barcode: "", tracked: true, backorder: false, active: true };
  });
}

/* ====================================================================================================
 * Productos: validación en cliente (espejo de lo que rechaza el backend)
 * ================================================================================================== */
export interface FormIssue { path: string; message: string }
export type FieldErrors = Record<string, string>;
const MAX_MONEY = 1e10;

/** Valor de un metafield según su tipo (mismas reglas que `metafields.service.ts`). */
export function metafieldValueError(type: string, value: string): string | undefined {
  if (value.length > 5000) return "Máximo 5000 caracteres";
  const numeric = type === "number_integer" || type === "number_decimal";
  if (numeric || type === "boolean" || type === "json" || type === "url" || type === "color") if (!value.trim()) return "Obligatorio para este tipo";
  switch (type) {
    case "number_integer": return Number.isInteger(Number(value)) ? undefined : "Debe ser un número entero";
    case "number_decimal": return Number.isNaN(Number(value)) ? "Debe ser un número" : undefined;
    case "boolean": return value === "true" || value === "false" ? undefined : "Debe ser “true” o “false”";
    case "json": try { JSON.parse(value); } catch { return "JSON no válido"; } return new Blob([value]).size > 10240 ? "El JSON no puede superar 10 KB" : undefined;
    case "url": try { return ["http:", "https:"].includes(new URL(value).protocol) ? undefined : "La URL debe ser http o https"; } catch { return "URL no válida"; }
    case "color": return /^#[0-9A-Fa-f]{6}$/.test(value) ? undefined : "Color en formato #RRGGBB";
    default: return undefined;
  }
}
/** Validación común de metafields (producto y colección). Rutas: `metafields.<i>.<campo>`. */
function metafieldIssues(list: MetafieldForm[]): FormIssue[] {
  const out: FormIssue[] = [];
  const used = new Set<string>();
  const active = list.map((m, i) => [m, i] as const).filter(([m]) => m.saved || m.key.trim() || m.value.trim());
  if (active.length > 50) out.push({ path: "metafields", message: "Máximo 50 metafields" });
  for (const [m, i] of active) {
    if (m.saved) { const e = metafieldValueError(m.type, m.value); if (e) out.push({ path: `metafields.${i}.value`, message: e }); continue; }
    const ns = m.namespace.trim(), key = m.key.trim();
    if (!ns || ns.length > 60 || !META_KEY.test(ns)) out.push({ path: `metafields.${i}.namespace`, message: "Espacio de nombres: 1-60 letras, números, guiones o guion bajo" });
    if (!key || key.length > 60 || !META_KEY.test(key)) out.push({ path: `metafields.${i}.key`, message: "Clave: 1-60 letras, números, guiones o guion bajo" });
    if (key && used.has(`${ns}.${key}`)) out.push({ path: `metafields.${i}.key`, message: "Clave repetida en este espacio de nombres" });
    used.add(`${ns}.${key}`);
    const e = metafieldValueError(m.type, m.value);
    if (e) out.push({ path: `metafields.${i}.value`, message: e });
  }
  return out;
}

export function validateProduct(p: ProductForm, base?: ProductForm | null): FormIssue[] {
  const out: FormIssue[] = [];
  const add = (path: string, message: string) => out.push({ path, message });
  if (!p.title.trim()) add("title", "El título es obligatorio");
  else if (p.title.trim().length > 255) add("title", "Máximo 255 caracteres");
  const handle = p.handle.trim() || slugify(p.title);
  if (p.handle.trim() && (!HANDLE.test(handle) || handle.length > 120)) add("handle", "Handle inválido: minúsculas, números y guiones (máx. 120)");
  else if (!p.handle.trim() && p.title.trim() && !HANDLE.test(handle)) add("handle", "No se puede generar un handle del título: escribe uno (minúsculas, números y guiones)");
  if (p.description.length > 10000) add("description", "Máximo 10 000 caracteres");
  if (p.vendor.trim().length > 255) add("vendor", "Máximo 255 caracteres");
  if (p.type.trim().length > 255) add("type", "Máximo 255 caracteres");
  if (p.tags.length > 50) add("tags", "Máximo 50 etiquetas");
  else if (p.tags.some((t) => t.length > 50)) add("tags", "Cada etiqueta admite máximo 50 caracteres");
  if (p.seoTitle.trim().length > 255) add("seoTitle", "Máximo 255 caracteres");
  if (p.seoDescription.trim().length > 1000) add("seoDescription", "Máximo 1000 caracteres");
  const opts = cleanOptions(p.options);
  if (opts.length > 3) add("options", "Máximo 3 opciones");
  if (new Set(opts.map((o) => o.name.toLowerCase())).size !== opts.length) add("options", "Hay opciones con el mismo nombre");
  if (p.options.some((o) => (o.name.trim() && !o.values.length) || (!o.name.trim() && o.values.length))) add("options", "Cada opción necesita un nombre y al menos un valor (o quítala)");
  if (p.images.length > 50) add("images", "Máximo 50 imágenes");
  if (p.images.some((i) => i.alt.trim().length > 255)) add("images", "El texto alternativo admite máximo 255 caracteres");
  const seen = new Map<string, string>();
  if (!p.variants.length) add("variants", "El producto necesita al menos una variante");
  for (const v of p.variants) {
    const at = (f: string) => `variants.${v.id}.${f}`;
    if (!Number.isInteger(v.price) || v.price < 0 || v.price > MAX_MONEY) add(at("price"), "Precio: entero entre 0 y 10 000 000 000");
    if (v.compareAt !== undefined) {
      if (!Number.isInteger(v.compareAt) || v.compareAt < 0 || v.compareAt > MAX_MONEY) add(at("compareAt"), "Precio comparado inválido");
      else if (v.compareAt < v.price) add(at("compareAt"), "El comparado debe ser mayor o igual al precio");
    }
    if (v.weight !== undefined && (!Number.isInteger(v.weight) || v.weight < 0)) add(at("weight"), "El peso es un entero mayor o igual a 0");
    const sku = v.sku.trim();
    if (sku.length > 120) add(at("sku"), "Máximo 120 caracteres");
    else if (sku && seen.has(sku)) add(at("sku"), `SKU repetido (ya lo usa “${seen.get(sku)}”)`);
    else if (sku) seen.set(sku, v.title || TYPE_LABEL_DEFAULT);
    if (v.barcode.trim().length > 120) add(at("barcode"), "Máximo 120 caracteres");
    if (v.title.length > 255) add(at("title"), "El nombre de la variante admite máximo 255 caracteres");
  }
  if (p.status === "active" && (!base || base.status !== "active") && !p.variants.some((v) => v.price > 0)) add("status", "Para publicar necesitas al menos una variante con precio mayor a 0");
  out.push(...metafieldIssues(p.metafields));
  return out;
}

/* ====================================================================================================
 * Productos: borrador local ↔ servidor (comparación y fusión de tres vías)
 * ================================================================================================== */
/** Firma de lo que el usuario puede editar (ignora ids/versión/saneado del servidor): sirve para saber si hay cambios sin guardar. */
export const formSig = (p: ProductForm): string => JSON.stringify([
  p.title, p.description, p.handle, p.status, p.vendor, p.type, p.tags, p.seoTitle, p.seoDescription, p.options,
  p.variants.map((v) => [v.id, v.title, v.options, v.price, v.compareAt ?? null, v.sku, v.weight ?? null, v.barcode, v.tracked, v.backorder]),
  p.images.map((i) => [storedMediaUrl(i.url), i.alt]), p.metafields.map((m) => [m.namespace, m.key, m.type, m.value]),
]);

const ALL_STEPS: SaveStep[] = ["options", "variants", "product", "images", "metafields", "status"];
/**
 * Fusiona el borrador actual (`cur`) con el estado fresco del servidor (`fresh`) respetando lo que el usuario tecleó:
 * - un campo que el usuario NO tocó (igual a `old`, la base con la que empezó) adopta el valor del servidor (puede haber cambiado otra persona);
 * - un campo que sí tocó se conserva, salvo que su paso ya se haya guardado tal cual se envió (`done` + `sent`): entonces se adopta el valor
 *   saneado por el servidor para que no quede un "cambio sin guardar" falso.
 */
export function mergeDraft(a: { old: ProductForm; cur: ProductForm; fresh: ProductForm; sent: ProductForm; done?: SaveStep[] }): ProductForm {
  const { old, cur, fresh, sent } = a, done = a.done ?? ALL_STEPS;
  const persisted = (step: SaveStep, k: keyof ProductForm) => done.includes(step) && same(cur[k], sent[k]);
  const pick = <K extends keyof ProductForm>(k: K, step: SaveStep): ProductForm[K] => (persisted(step, k) || same(cur[k], old[k]) ? fresh[k] : cur[k]);
  const optionsTouched = !same(cur.options, old.options);
  const options = pick("options", "options");
  const optsSame = same(cleanOptions(options), cleanOptions(fresh.options));
  const oldV = new Map(old.variants.map((v) => [v.id, v]));
  const freshV = new Map(fresh.variants.map((v) => [v.id, v]));
  let variants: VariantForm[];
  const sig = (l: VariantForm[]) => l.map((v) => [v.id, v.title, v.options, v.price, v.compareAt ?? null, v.sku, v.weight ?? null, v.barcode, v.tracked, v.backorder]);
  if (done.includes("variants") && same(sig(cur.variants), sig(sent.variants)) && !same(sig(cur.variants), sig(old.variants))) variants = fresh.variants;
  else {
    const used = new Set<string>();
    variants = [];
    for (const cv of cur.variants) {
      let fv = freshV.get(cv.id);
      if (!fv && cv.isNew) fv = fresh.variants.find((x) => !used.has(x.id) && !oldV.has(x.id) && !cur.variants.some((o) => o.id === x.id) && x.title === cv.title);
      if (!fv) { if (cv.isNew) variants.push(cv); continue; } // desaparecida en el servidor (otra persona la quitó): se descarta
      used.add(fv.id);
      const ov = oldV.get(cv.id);
      const f = <K extends keyof VariantForm>(k: K): VariantForm[K] => (ov && same(cv[k], ov[k]) ? fv[k] : cv[k]);
      variants.push({ ...fv, title: optionsTouched ? cv.title : fv.title, options: optionsTouched ? cv.options : fv.options, optionValueIds: optsSame ? fv.optionValueIds : cv.optionValueIds, price: f("price"), compareAt: f("compareAt"), sku: f("sku"), weight: f("weight"), barcode: f("barcode"), tracked: f("tracked"), backorder: f("backorder") });
    }
    for (const fv of fresh.variants) if (!used.has(fv.id) && !oldV.has(fv.id)) variants.push(fv); // añadidas por otra persona
  }
  const mkey = (m: MetafieldForm) => `${m.namespace}.${m.key}`;
  const freshM = new Map(fresh.metafields.map((m) => [mkey(m), m])), oldM = new Map(old.metafields.map((m) => [mkey(m), m]));
  const metafields = cur.metafields.map((cm) => {
    const fm = freshM.get(mkey(cm)), om = oldM.get(mkey(cm));
    if (!fm) return cm;
    if (persisted("metafields", "metafields") || (om && cm.value === om.value && cm.type === om.type)) return fm;
    return { ...cm, saved: true };
  });
  for (const fm of fresh.metafields) if (!metafields.some((m) => mkey(m) === mkey(fm)) && !oldM.has(mkey(fm))) metafields.push(fm);
  const imgSig = (l: ProductForm["images"]) => l.map((i) => [storedMediaUrl(i.url), i.alt]);
  const images = (done.includes("images") && same(imgSig(cur.images), imgSig(sent.images))) || same(imgSig(cur.images), imgSig(old.images)) ? fresh.images : cur.images;
  return {
    ...fresh, title: pick("title", "product"), description: pick("description", "product"), handle: pick("handle", "product"), vendor: pick("vendor", "product"), type: pick("type", "product"),
    tags: pick("tags", "product"), seoTitle: pick("seoTitle", "product"), seoDescription: pick("seoDescription", "product"), status: pick("status", "status"),
    options, variants, images, metafields,
  };
}

/* ====================================================================================================
 * Productos: escritura (varias llamadas coordinadas)
 * ================================================================================================== */
export type SaveStep = "options" | "variants" | "product" | "images" | "metafields" | "status";
const STEP_LABEL: Record<SaveStep | "create", string> = { options: "las opciones", variants: "las variantes", product: "los datos del producto", images: "las imágenes", metafields: "los metafields", status: "el estado", create: "el producto" };
const listEs = (l: string[]) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}`);

/** Resultado de un guardado que no llegó al final: qué se guardó, qué falló y el estado fresco del servidor. */
export interface SaveOutcome { fresh: ProductForm | null; failed: SaveStep | "create"; done: SaveStep[]; fieldErrors: FieldErrors; createdId?: string; conflict: boolean; message: string }
class StepFailure extends Error {
  constructor(public step: SaveStep | "create", public cause0: unknown, public fieldErrors: FieldErrors = {}, public conflict = false) { super(cause0 instanceof Error ? cause0.message : "error"); }
}
/** Un campo que el usuario tocó cambió en el servidor por otra persona: no se pisa. */
class RealConflict extends Error {}

/**
 * VERSIÓN DE VARIANTE. El detalle del producto NO la incluye (solo POST/PATCH de variantes la devuelven) y el 409 tampoco indica la actual.
 * La versión solo crece, así que lo último que conocemos es una cota inferior segura: se parte de ahí. Si el PATCH da 409 se sondea al alza con
 * PATCH vacíos (`{version}` sin campos: no modifican ni auditan nada y devuelven la variante completa, con su versión y valores ACTUALES), y con esa
 * respuesta se vuelve a comprobar el conflicto de campos antes del PATCH real. REQUIERE BACKEND: exponer `version` en `variants[]` del detalle.
 */
const verCache = new Map<string, number>();
const MAX_PROBES = 40;
const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409 && e.code === "CONCURRENT_UPDATE";

const VF = ["title", "sku", "price", "compareAtPrice", "weightGrams", "barcode", "trackInventory", "allowBackorder"] as const;
type VKey = (typeof VF)[number];
type VNorm = Record<VKey, string | number | boolean | null>;
const VLABEL: Record<VKey, string> = { title: "nombre", sku: "SKU", price: "precio", compareAtPrice: "precio comparado", weightGrams: "peso", barcode: "código de barras", trackInventory: "seguimiento de inventario", allowBackorder: "backorder" };
const normForm = (v: VariantForm): VNorm => ({ title: v.title, sku: nullable(v.sku), price: v.price, compareAtPrice: v.compareAt ?? null, weightGrams: v.weight ?? null, barcode: nullable(v.barcode), trackInventory: v.tracked, allowBackorder: v.backorder });
const normApi = (a: ApiVariant): VNorm => ({ title: a.title, sku: a.sku, price: a.price, compareAtPrice: a.compareAtPrice, weightGrams: a.weightGrams, barcode: a.barcode, trackInventory: a.trackInventory, allowBackorder: a.allowBackorder });

/** Solo los campos que el usuario tocó (difieren de `base`); si el servidor ya los tiene igual se omiten y si otra persona los cambió se informa conflicto. */
function planVariant(srv: ApiVariant, want: VNorm, baseN: VNorm, ids: string[] | null): { body: Record<string, unknown>; conflicts: VKey[] } {
  const s = normApi(srv), body: Record<string, unknown> = {}, conflicts: VKey[] = [];
  for (const k of VF) {
    if (same(baseN[k], want[k])) continue; // no lo tocó
    if (same(s[k], want[k])) continue; // ya está así en el servidor
    if (!same(s[k], baseN[k])) { conflicts.push(k); continue; } // otra persona lo cambió a otra cosa
    body[k] = want[k];
  }
  if (ids && !sameArr(srv.optionValueIds, ids)) body.optionValueIds = ids;
  return { body, conflicts };
}
const conflictError = (title: string, srv: ApiVariant, conflicts: VKey[]) => new RealConflict(`Variante “${title}”: ${listEs(conflicts.map((k) => VLABEL[k]))} cambió en el servidor mientras editabas (${conflicts.map((k) => `${VLABEL[k]}: ${String(normApi(srv)[k] ?? "—")}`).join(", ")}). No se sobrescribió.`);

/** Devuelve `true` si escribió en el servidor. */
async function patchVariantSafe(pid: string, cur: ApiVariant, want: VNorm, baseN: VNorm, ids: string[] | null, title: string): Promise<boolean> {
  const url = `/admin/products/${pid}/variants/${cur.id}`;
  let snap = cur, plan = planVariant(snap, want, baseN, ids);
  if (plan.conflicts.length) throw conflictError(title, snap, plan.conflicts);
  if (!Object.keys(plan.body).length) return false;
  let v = verCache.get(cur.id) ?? 1;
  for (let round = 0; round < 4; round++) {
    try {
      const r = await api.patch<{ version: number }>(url, { ...plan.body, version: v });
      verCache.set(cur.id, r.version);
      return true;
    } catch (e) {
      if (!isConflict(e)) throw e;
    }
    // descubrir la versión actual (y los valores actuales) con PATCH vacíos, empezando justo por encima de la última conocida
    let found: ApiVariant | null = null;
    for (let p = v + 1, n = 0; n < MAX_PROBES && !found; p++, n++) {
      try { found = await api.patch<ApiVariant>(url, { version: p }); } catch (e) { if (!isConflict(e)) throw e; }
    }
    if (!found || found.version === undefined) throw new Error(`No se pudo determinar la versión de la variante “${title}”. Recarga el producto e inténtalo de nuevo.`);
    verCache.set(cur.id, found.version);
    snap = found;
    plan = planVariant(snap, want, baseN, ids);
    if (plan.conflicts.length) throw conflictError(title, snap, plan.conflicts);
    if (!Object.keys(plan.body).length) return false;
    v = found.version;
  }
  throw new Error(`La variante “${title}” cambia constantemente (otra persona la está editando). Inténtalo de nuevo.`);
}

/** Nest responde 200 con cuerpo vacío en los endpoints `void` y `api.*` intenta parsear JSON: si la petición ya tuvo éxito, ese fallo se ignora. */
const voidOk = async (p: Promise<unknown>): Promise<void> => { try { await p; } catch (e) { if (!(e instanceof SyntaxError)) throw e; } };
const nullable = (s: string): string | null => (s.trim() ? s.trim() : null);
const cleanOptions = (o: ProductForm["options"]) => o.map((x) => ({ name: x.name.trim(), values: [...new Set(x.values.map((v) => v.trim()).filter(Boolean))] })).filter((x) => x.name && x.values.length);
const variantBody = (v: VariantForm, optionValueIds: string[]) => ({
  title: v.title, sku: nullable(v.sku), price: v.price, compareAtPrice: v.compareAt ?? null, weightGrams: v.weight ?? null, barcode: nullable(v.barcode),
  trackInventory: v.tracked, allowBackorder: v.backorder, optionValueIds, isActive: true,
});
const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Reconcilia variantes deseadas contra las del servidor: crea, modifica (solo lo que el usuario tocó) y desactiva (solo las que el usuario quitó).
 * Sigue con las demás variantes si una falla y lanza al final un error agregado (con `fieldErrors` por variante).
 */
async function syncVariants(pid: string, desired: VariantForm[], opts: ApiOption[], current: ApiVariant[], base: ProductForm | null, optionsTouched: boolean, errs: FieldErrors): Promise<void> {
  const idOf = (oi: number, value: string) => opts[oi]?.values.find((x) => x.value === value)?.id;
  const curMap = new Map(current.map((v) => [v.id, v]));
  const baseMap = new Map((base?.variants ?? []).map((v) => [v.id, v]));
  const claimed = new Set<string>();
  const failures: string[] = [];
  let applied = 0; // variantes que SÍ se escribieron (para informar de un guardado parcial dentro del paso)
  for (const v of desired) {
    const ids = opts.length ? v.options.map((val, oi) => idOf(oi, val)).filter((x): x is string => !!x) : [];
    let cur = curMap.get(v.id);
    if (!cur && !base) cur = current.find((c) => c.title === v.title && !claimed.has(c.id));
    try {
      if (!cur) {
        const r = await api.post<{ id: string; version: number }>(`/admin/products/${pid}/variants`, variantBody(v, ids));
        verCache.set(r.id, r.version); claimed.add(r.id); applied++;
        continue;
      }
      claimed.add(cur.id);
      if (!cur.isActive) continue; // otra persona la eliminó: no se reactiva
      const want = normForm(v);
      const baseV = baseMap.get(v.id);
      const baseN = baseV ? normForm(baseV) : normApi(cur);
      // optionValueIds solo si el usuario cambió la estructura de opciones y se resolvieron todos los valores
      const sendIds = (optionsTouched || !base) && opts.length > 0 && ids.length === opts.length ? ids : null;
      if (await patchVariantSafe(pid, cur, want, baseN, sendIds, v.title || TYPE_LABEL_DEFAULT)) applied++;
    } catch (e) {
      const label = v.title || TYPE_LABEL_DEFAULT;
      if (e instanceof ApiError && e.code === "SKU_TAKEN") { errs[`variants.${v.id}.sku`] = `El SKU “${v.sku.trim()}” ya está en uso en otro producto o variante`; failures.push(`Variante “${label}”: el SKU “${v.sku.trim()}” ya está en uso`); }
      else if (e instanceof RealConflict) { errs[`variants.${v.id}`] = e.message; failures.push(e.message); }
      else { const m = errorMessage(e); errs[`variants.${v.id}`] = m; failures.push(`Variante “${label}”: ${m}`); }
    }
  }
  for (const c of current) {
    if (!c.isActive || claimed.has(c.id) || (base && !baseMap.has(c.id))) continue;
    try { await voidOk(api.delete(`/admin/products/${pid}/variants/${c.id}`)); applied++; } catch (e) { failures.push(`No se pudo quitar la variante “${c.title}”: ${errorMessage(e)}`); }
  }
  if (failures.length) throw Object.assign(new RealConflict(failures.join(" · ")), { applied });
}

async function putMetafields(pid: string, list: MetafieldForm[], base: MetafieldForm[]): Promise<boolean> {
  const prev = new Map(base.map((m) => [`${m.namespace}.${m.key}`, m]));
  const changed = list.filter((m) => m.key.trim() && (!prev.has(`${m.namespace}.${m.key}`) || prev.get(`${m.namespace}.${m.key}`)!.value !== m.value || prev.get(`${m.namespace}.${m.key}`)!.type !== m.type));
  if (changed.length) await api.put(`/admin/products/${pid}/metafields`, { metafields: changed.map((m) => ({ namespace: m.namespace.trim(), key: m.key.trim(), type: m.type, value: m.value })) });
  return changed.length > 0;
}
const imgList = (x: ProductForm["images"]) => x.map((i) => ({ url: storedMediaUrl(i.url), alt: nullable(i.alt) }));
/** Imágenes: la API reemplaza la lista completa, así que antes se comprueba que nadie más la haya cambiado. */
async function putImages(id: string, d: ProductForm, base: ProductForm | null, server?: ApiProduct): Promise<boolean> {
  const want = imgList(d.images), had = imgList(base?.images ?? []);
  if (same(want, had)) return false;
  if (base) {
    const srv = (server ?? (await api.get<ApiProduct>(`/admin/products/${id}`))).media.map((m) => ({ url: m.url, alt: m.alt ?? null }));
    if (same(srv, want)) return false;
    if (!same(srv, had)) throw new RealConflict("Las imágenes del producto cambiaron en el servidor mientras editabas. No se sobrescribieron: recarga el producto y vuelve a aplicar tu cambio.");
  }
  await api.put(`/admin/products/${id}/media`, { media: want });
  return true;
}

/** Datos del producto: solo los campos que el usuario tocó. Con 409 se vuelve a leer: si otra persona cambió ESE campo no se pisa; si no, se reintenta con la versión nueva. */
async function patchProduct(id: string, d: ProductForm, base: ProductForm): Promise<ApiProduct | null> {
  const handle = d.handle.trim();
  const want: Record<string, unknown> = { title: d.title.trim(), descriptionHtml: d.description, vendor: nullable(d.vendor), productType: nullable(d.type), tags: d.tags, seoTitle: nullable(d.seoTitle), seoDescription: nullable(d.seoDescription), ...(handle ? { handle } : {}) };
  const had: Record<string, unknown> = { title: base.title, descriptionHtml: base.description, vendor: nullable(base.vendor), productType: nullable(base.type), tags: base.tags, seoTitle: nullable(base.seoTitle), seoDescription: nullable(base.seoDescription), handle: base.handle };
  const LABEL: Record<string, string> = { title: "el título", descriptionHtml: "la descripción", vendor: "el proveedor", productType: "el tipo", tags: "las etiquetas", seoTitle: "el título SEO", seoDescription: "la descripción SEO", handle: "el handle" };
  let body: Record<string, unknown> = {};
  for (const k of Object.keys(want)) if (!same(want[k], had[k])) body[k] = want[k];
  if (!Object.keys(body).length) return null;
  let version = base.version;
  for (let round = 0; round < 3; round++) {
    try { return await api.patch<ApiProduct>(`/admin/products/${id}`, { ...body, version }); } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === "CONFLICT") throw Object.assign(new RealConflict("Ese handle ya está en uso por otro producto"), { handle: true });
      if (!isConflict(e)) throw e;
    }
    const srv = await api.get<ApiProduct>(`/admin/products/${id}`);
    const now: Record<string, unknown> = { title: srv.title, descriptionHtml: srv.descriptionHtml, vendor: srv.vendor, productType: srv.productType, tags: srv.tags, seoTitle: srv.seoTitle, seoDescription: srv.seoDescription, handle: srv.handle };
    const clash = Object.keys(body).filter((k) => !same(now[k], body[k]) && !same(now[k], had[k]));
    if (clash.length) throw new RealConflict(`Otra persona cambió ${listEs(clash.map((k) => LABEL[k]))} mientras editabas. No se sobrescribió: recarga el producto y vuelve a aplicar tu cambio.`);
    body = Object.fromEntries(Object.entries(body).filter(([k]) => !same(now[k], body[k])));
    if (!Object.keys(body).length) return srv;
    version = srv.version;
  }
  throw new RealConflict("El producto cambia constantemente (otra persona lo está editando). Inténtalo de nuevo.");
}

/**
 * Guarda (crea o actualiza) un producto en pasos independientes. Orden para minimizar riesgo: opciones (puede pedir confirmación antes de tocar nada) →
 * variantes (aquí aparecen los SKU duplicados) → datos del producto → imágenes → metafields → estado (publicar/archivar al final, con todo ya guardado).
 * Si un paso falla se lanza `StepFailure` con lo ya guardado; el llamador recarga el servidor y fusiona sin perder lo tecleado.
 */
async function saveProduct(d: ProductForm, base: ProductForm | null, force: boolean, done: SaveStep[]): Promise<ProductForm> {
  const step = async (name: SaveStep, fn: () => Promise<boolean | void>, errs: FieldErrors = {}) => {
    try { if ((await fn()) !== false) done.push(name); } catch (e) { throw new StepFailure(name, e, errs, e instanceof RealConflict); }
  };
  const errs: FieldErrors = {};
  const opts = cleanOptions(d.options);
  const optBody = opts.map((o, i) => ({ name: o.name, position: i, values: o.values.map((value, j) => ({ value, position: j })) }));
  if (!base) {
    const handle = d.handle.trim();
    let detail: ApiProduct;
    try {
      detail = await api.post<ApiProduct>("/admin/products", { title: d.title.trim(), descriptionHtml: d.description, vendor: nullable(d.vendor), productType: nullable(d.type), tags: d.tags, seoTitle: nullable(d.seoTitle), seoDescription: nullable(d.seoDescription), ...(handle ? { handle } : {}), options: optBody.length ? optBody : undefined, variants: optBody.length ? undefined : d.variants.slice(0, 1).map((v) => variantBody(v, [])) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && handle) errs.handle = "Ese handle ya está en uso por otro producto";
      if (e instanceof ApiError && e.code === "SKU_TAKEN" && d.variants[0]) errs[`variants.${d.variants[0].id}.sku`] = `El SKU “${d.variants[0].sku.trim()}” ya está en uso`;
      throw new StepFailure("create", e, errs);
    }
    const id = detail.id;
    done.push("product");
    const fail = (e: unknown) => Object.assign(e instanceof StepFailure ? e : new StepFailure("variants", e), { createdId: id });
    try {
      if (optBody.length) await step("variants", () => syncVariants(id, d.variants, detail.options, detail.variants, null, true, errs), errs);
      await step("images", () => putImages(id, d, null));
      await step("metafields", () => putMetafields(id, d.metafields.filter((m) => m.key.trim()), []));
      await step("status", async () => {
        if (d.status === "active") await api.post(`/admin/products/${id}/publish`);
        else if (d.status === "archived") await api.post(`/admin/products/${id}/archive`);
        else return false;
      });
    } catch (e) { throw fail(e); }
    return loadProduct(id);
  }
  const id = base.id;
  const optionsTouched = !same(opts, cleanOptions(base.options));
  const st: { server: ApiProduct | null } = { server: null }; // último detalle conocido del servidor
  if (optionsTouched) await step("options", async () => { st.server = await api.put<ApiProduct>(`/admin/products/${id}/options`, { options: optBody, force }); });
  const variantsTouched = optionsTouched || !same(base.variants.map((v) => [v.id, normForm(v)]), d.variants.map((v) => [v.id, normForm(v)]));
  if (variantsTouched) await step("variants", async () => {
    const srv = st.server ?? (await api.get<ApiProduct>(`/admin/products/${id}`));
    st.server = srv;
    await syncVariants(id, d.variants, srv.options, srv.variants, base, optionsTouched, errs);
  }, errs);
  await step("product", async () => { const r = await patchProduct(id, d, base); if (!r) return false; st.server = r; });
  await step("images", () => putImages(id, d, base, st.server ?? undefined));
  await step("metafields", () => putMetafields(id, d.metafields.filter((m) => m.key.trim()), base.metafields));
  await step("status", async () => {
    const cur = st.server?.status ?? base.status;
    if (d.status === cur) return false;
    if (d.status === "active") await api.post(`/admin/products/${id}/publish`);
    else if (d.status === "archived") await api.post(`/admin/products/${id}/archive`);
    else return false;
  });
  return loadProduct(id);
}

const INV_PRODUCT = [["products"], ["products-all"], ["product"], ["product-search"], ["product-handle"], ["levels"], ["collection"], ["collections"]];
export interface SaveVars { draft: ProductForm; base: ProductForm | null }
/**
 * Guarda (crea o actualiza) un producto. `confirmForce` se invoca si quitar opciones desactivaría variantes activas.
 * Si el guardado queda a medias se lanza un error con `outcome` y se llama a `onPartial` con el estado fresco del servidor: el editor conserva lo tecleado,
 * fusiona solo lo ya persistido y permite reintentar únicamente lo pendiente (el siguiente guardado compara contra el servidor).
 */
export const useSaveProduct = (cb: { onSaved: (p: ProductForm, v: SaveVars) => void; onPartial?: (o: SaveOutcome, v: SaveVars) => void; confirmForce?: (msg: string) => Promise<boolean> }) => {
  const qc = useQueryClient();
  return useAction(async (vars: SaveVars) => {
    const { draft, base } = vars;
    const done: SaveStep[] = [];
    try {
      let saved: ProductForm;
      try { saved = await saveProduct(draft, base, false, done); } catch (e) {
        const cause = e instanceof StepFailure ? e.cause0 : e;
        if (e instanceof StepFailure && e.step === "options" && cause instanceof ApiError && cause.code === "OPTION_VALUES_IN_USE" && base && cb.confirmForce && await cb.confirmForce("Quitar o renombrar esos valores de opción desactivará las variantes que los usan (se conservarán sus datos si solo renombras). ¿Continuar?")) {
          done.length = 0;
          saved = await saveProduct(draft, base, true, done);
        } else throw e;
      }
      qc.setQueryData(["product", saved.id], saved);
      cb.onSaved(saved, vars);
      return saved;
    } catch (e) {
      if (!(e instanceof StepFailure)) throw e;
      const createdId = (e as StepFailure & { createdId?: string }).createdId;
      const id = base?.id || createdId;
      const fresh = id ? await loadProduct(id).catch(() => null) : null;
      const cause = e.cause0;
      const fieldErrors: FieldErrors = { ...e.fieldErrors };
      if (cause instanceof RealConflict && (cause as { handle?: boolean }).handle) fieldErrors.handle = cause.message;
      const why = cause instanceof RealConflict ? cause.message : errorMessage(cause);
      const label = (s: SaveStep) => (!base && s === "product" ? "el producto" : STEP_LABEL[s]);
      const applied = (cause as { applied?: number }).applied ?? 0; // variantes ya escritas dentro del paso que falló
      const saved = [...done.map(label), ...(applied > 0 ? [`${applied} variante${applied === 1 ? "" : "s"}`] : [])];
      const message = e.step === "create" ? `No se pudo crear el producto: ${why}` : saved.length ? `Se guardaron ${listEs(saved)}; falló ${STEP_LABEL[e.step]}: ${why}` : `No se guardó nada; falló ${STEP_LABEL[e.step]}: ${why}`;
      const outcome: SaveOutcome = { fresh, failed: e.step, done: [...done], fieldErrors, createdId, conflict: e.conflict, message };
      void qc.invalidateQueries({ queryKey: ["products"] });
      if (id) { void qc.invalidateQueries({ queryKey: ["product-search"] }); if (fresh) qc.setQueryData(["product", id], fresh); }
      cb.onPartial?.(outcome, vars);
      throw Object.assign(new Error(message), { outcome });
    }
    // la caché de ["product", id] ya se escribió con el resultado: no se vuelve a pedir el producto activo
  }, { invalidate: INV_PRODUCT.filter((k) => k[0] !== "product"), success: "Producto guardado" });
};

export interface BulkResult { action: string; processed: string[]; skipped: { id: string; reason: string }[] }
const SKIP_REASON: Record<string, string> = { ALREADY_ACTIVE: "ya estaba activo", ALREADY_ARCHIVED: "ya estaba archivado", NO_CHANGE: "sin cambios", NOT_FOUND: "no existe", NO_ACTIVE_VARIANT_WITH_PRICE: "sin variante activa con precio" };
export const bulkSummary = (r: BulkResult): string => `${r.processed.length} aplicado(s)${r.skipped.length ? `, ${r.skipped.length} omitido(s) (${[...new Set(r.skipped.map((s) => SKIP_REASON[s.reason] ?? s.reason))].join(", ")})` : ""}`;
export const useBulkProducts = (onResult?: (r: BulkResult) => void) =>
  useAction(({ ids, op, tag }: { ids: string[]; op: "publish" | "archive" | "delete" | "tag"; tag?: string }) =>
    api.post<BulkResult>("/admin/products/bulk", { ids, action: op === "tag" ? "add_tags" : op, ...(op === "tag" ? { tags: [tag] } : {}) }), { invalidate: INV_PRODUCT, onSuccess: (r) => onResult?.(r) });
export const useSetProductStatus = () =>
  useAction(({ id, status }: { id: string; status: ProductStatus }) => {
    if (status === "draft") throw new Error("La API no permite volver un producto a borrador");
    return api.post(`/admin/products/${id}/${status === "active" ? "publish" : "archive"}`);
  }, { invalidate: INV_PRODUCT, success: "Estado actualizado" });
export const useDuplicateProduct = (onDone?: (p: { id: string }) => void) =>
  useAction((id: string) => api.post<ApiProduct>(`/admin/products/${id}/duplicate`), { invalidate: INV_PRODUCT, success: "Producto duplicado", onSuccess: onDone });
export const useDeleteProduct = (onDone?: () => void) =>
  useAction((id: string) => voidOk(api.delete(`/admin/products/${id}`)), { invalidate: INV_PRODUCT.filter((k) => k[0] !== "product"), success: "Producto eliminado", onSuccess: onDone });

/* ====================================================================================================
 * Colecciones
 * ================================================================================================== */
export interface Rule { field: "tag" | "type" | "vendor" | "price"; op: "eq" | "neq" | "contains" | "gt" | "lt"; value: string }
export type CollectionSort = "manual" | "newest" | "price_asc" | "price_desc" | "title";
/**
 * Estado de la lista de productos de una colección manual:
 * - `known`: leída completa de la tienda (solo productos ACTIVOS: los borradores/archivados que pertenezcan a la colección no se pueden leer);
 * - `hidden`: colección oculta, la API no permite leer sus productos;
 * - `error`: la lectura falló (429/5xx/red) o es demasiado grande: NO se permite guardar la lista para no reemplazar la membresía con datos parciales.
 */
export type MembersState = "known" | "hidden" | "error";
export const MAX_COLLECTION_PRODUCTS = 1000;
export interface CollectionForm {
  id: string; handle: string; title: string; description: string; kind: "manual" | "smart"; published: boolean;
  products: ProductLite[]; membersState: MembersState; membersError: string | null; rules: Rule[]; match: "all" | "any"; sort: CollectionSort;
  imageMediaId: string | null; seoTitle: string; seoDescription: string; metafields: MetafieldForm[];
}
export interface CollectionItem { id: string; handle: string; title: string; kind: "manual" | "smart"; published: boolean; imageMediaId: string | null }
export const RULE_OPS: Record<Rule["field"], Rule["op"][]> = { tag: ["eq", "neq", "contains"], type: ["eq", "neq", "contains"], vendor: ["eq", "neq", "contains"], price: ["eq", "neq", "gt", "lt"] };

export const useCollections = () =>
  useQuery({ queryKey: ["collections"], queryFn: async () => (await fetchAll<ApiCollection>("/admin/collections")).items.map((c): CollectionItem => ({ id: c.id, handle: c.handle, title: c.title, kind: c.type, published: c.isPublished, imageMediaId: c.imageMediaId })), staleTime: 30_000 });

const SORTS: CollectionSort[] = ["manual", "newest", "price_asc", "price_desc", "title"];
type StorefrontPage = { products: { items: { id: string; handle: string; title: string; image: { url: string } | null }[]; hasMore: boolean; nextCursor: string | null } };
async function readMembers(handle: string): Promise<{ items: ProductLite[]; truncated: boolean }> {
  const out: ProductLite[] = [];
  let cursor: string | undefined;
  const pages = Math.ceil(MAX_COLLECTION_PRODUCTS / 100) + 1;
  for (let i = 0; i < pages; i++) {
    const r = await api.get<StorefrontPage>(`/storefront/collections/${encodeURIComponent(handle)}`, { query: { limit: 100, cursor } });
    out.push(...r.products.items.map(lite));
    if (!r.products.hasMore || !r.products.nextCursor) return { items: out, truncated: false };
    cursor = r.products.nextCursor;
  }
  return { items: out.slice(0, MAX_COLLECTION_PRODUCTS), truncated: true };
}
/** Lee los productos de una colección manual publicada. Nunca lanza: un fallo deja `state: "error"` (no editable) con el motivo. */
export async function loadCollectionMembers(handle: string): Promise<{ products: ProductLite[]; state: MembersState; error: string | null }> {
  try {
    const m = await readMembers(handle);
    if (m.truncated) return { products: [], state: "error", error: `La colección tiene más de ${MAX_COLLECTION_PRODUCTS} productos: la API solo permite gestionar hasta ${MAX_COLLECTION_PRODUCTS} desde aquí.` };
    return { products: m.items, state: "known", error: null };
  } catch (e) {
    return { products: [], state: "error", error: errorMessage(e) };
  }
}
async function loadCollection(id: string): Promise<CollectionForm> {
  const [c, m] = await Promise.all([api.get<ApiCollection>(`/admin/collections/${id}`), api.get<{ metafields: ApiMetafield[] }>(`/admin/collections/${id}/metafields`)]);
  // La API de administración no lista los miembros de una colección manual: solo es posible vía tienda (colecciones publicadas).
  let products: ProductLite[] = [], membersState: MembersState = c.type === "smart" ? "known" : "hidden", membersError: string | null = null;
  if (c.type === "manual" && c.isPublished) { const r = await loadCollectionMembers(c.handle); products = r.products; membersState = r.state; membersError = r.error; }
  return {
    id: c.id, handle: c.handle, title: c.title, description: c.descriptionHtml, kind: c.type, published: c.isPublished, products, membersState, membersError,
    rules: (c.rules?.conditions ?? []).map((x) => ({ field: x.field as Rule["field"], op: x.op as Rule["op"], value: String(x.value) })), match: c.rules?.match ?? "all",
    sort: SORTS.includes(c.sortOrder as CollectionSort) ? (c.sortOrder as CollectionSort) : "manual", imageMediaId: c.imageMediaId, seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "",
    metafields: m.metafields.map(mapMetafield),
  };
}
export const useCollection = (id: string) =>
  useQuery({ queryKey: ["collection", id], queryFn: async () => { try { return await loadCollection(id); } catch (e) { if (e instanceof ApiError && (e.status === 404 || e.code === "VALIDATION_ERROR")) return null; throw e; } } });
export const blankCollection = (): CollectionForm => ({ id: "", handle: "", title: "", description: "", kind: "manual", published: false, products: [], membersState: "known", membersError: null, rules: [], match: "all", sort: "manual", imageMediaId: null, seoTitle: "", seoDescription: "", metafields: [] });

const rulesBody = (c: Pick<CollectionForm, "rules" | "match">) => ({ match: c.match, conditions: c.rules.map((r) => ({ field: r.field, op: r.op, value: r.field === "price" ? Number(r.value) : r.value.trim() })) });
const rulesValid = (rules: Rule[]) => rules.length > 0 && rules.every((r) => (r.field === "price" ? r.value.trim() !== "" && Number.isSafeInteger(Number(r.value)) && Number(r.value) >= 0 : r.value.trim() !== ""));
export const rulesReady = (c: Pick<CollectionForm, "kind" | "rules">) => c.kind === "smart" && rulesValid(c.rules);

/** ¿Hay que reemplazar la lista de productos? (la API solo ofrece PUT total, sin altas/bajas incrementales). */
export const membersChanged = (c: CollectionForm, base: CollectionForm | null): boolean =>
  c.kind === "manual" && (!base || base.kind !== "manual" ? c.products.length > 0 : base.membersState === "known" ? !sameArr(base.products.map((p) => p.id), c.products.map((p) => p.id)) : c.products.length > 0);

export function validateCollection(c: CollectionForm): FormIssue[] {
  const out: FormIssue[] = [];
  const add = (path: string, message: string) => out.push({ path, message });
  if (!c.title.trim()) add("title", "El título es obligatorio"); else if (c.title.trim().length > 255) add("title", "Máximo 255 caracteres");
  const handle = c.handle.trim() || slugify(c.title);
  if (c.handle.trim() && (!HANDLE.test(handle) || handle.length > 120)) add("handle", "Handle inválido: minúsculas, números y guiones (máx. 120)");
  if (c.seoTitle.trim().length > 255) add("seoTitle", "Máximo 255 caracteres");
  if (c.kind === "smart" && !rulesValid(c.rules)) add("rules", "Una colección inteligente necesita al menos una regla completa (los precios son enteros)");
  if (c.kind === "manual" && c.products.length > MAX_COLLECTION_PRODUCTS) add("products", `Máximo ${MAX_COLLECTION_PRODUCTS} productos por colección`);
  out.push(...metafieldIssues(c.metafields));
  return out;
}

/** Vista previa de una colección inteligente (la API devuelve hasta 24 productos y el total). */
export const usePreviewRules = (c: Pick<CollectionForm, "kind" | "rules" | "match">) => {
  const ready = rulesReady(c);
  return useQuery({
    queryKey: ["preview-rules", c.match, c.rules], enabled: ready, placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      await new Promise((r) => setTimeout(r, 400)); // antirrebote: la consulta anterior se cancela al cambiar la clave
      if (signal.aborted) throw new Error("cancelled");
      const r = await api.post<{ products: { id: string; handle: string; title: string }[]; total: number }>("/admin/collections/preview-rules", { rules: rulesBody(c) });
      return { total: r.total, products: r.products.map((p) => ({ id: p.id, title: p.title })) };
    },
  });
};

async function saveCollection(c: CollectionForm, base: CollectionForm | null): Promise<CollectionForm> {
  const issues = validateCollection(c);
  if (issues.length) throw new Error(issues[0].message);
  const handle = c.handle.trim() || slugify(c.title);
  const touched = membersChanged(c, base);
  if (touched && base && base.membersState === "error") throw new Error("No se pudo cargar la lista de productos de la colección: reintenta la carga antes de guardar cambios en ella.");
  const body = { handle, title: c.title.trim(), descriptionHtml: c.description, type: c.kind, rules: c.kind === "smart" ? rulesBody(c) : null, sortOrder: c.sort, seoTitle: nullable(c.seoTitle), seoDescription: nullable(c.seoDescription), imageMediaId: c.imageMediaId, isPublished: c.published };
  const saved = base ? await api.patch<ApiCollection>(`/admin/collections/${base.id}`, body) : await api.post<ApiCollection>("/admin/collections", body);
  try {
    if (touched) await voidOk(api.put(`/admin/collections/${saved.id}/products`, { products: c.products.map((p) => ({ productId: p.id })) }));
    const list = c.metafields.filter((m) => m.key.trim());
    const prev = new Map((base?.metafields ?? []).map((m) => [`${m.namespace}.${m.key}`, m]));
    const changed = list.filter((m) => { const p = prev.get(`${m.namespace}.${m.key}`); return !p || p.value !== m.value || p.type !== m.type; });
    if (changed.length) await api.put(`/admin/collections/${saved.id}/metafields`, { metafields: changed.map((m) => ({ namespace: m.namespace.trim(), key: m.key.trim(), type: m.type, value: m.value })) });
  } catch (e) {
    throw Object.assign(new Error(`La colección se guardó, pero faltó algo: ${errorMessage(e)}`), { createdId: saved.id });
  }
  return loadCollection(saved.id);
}
const INV_COLL = [["collections"], ["collection"], ["preview-rules"]];
export const useSaveCollection = (cb: { onSaved: (c: CollectionForm) => void; onFail?: (id: string) => void }) => {
  const qc = useQueryClient();
  return useAction(({ draft, base }: { draft: CollectionForm; base: CollectionForm | null }) => saveCollection(draft, base).catch((e) => {
    const id = (e as { createdId?: string }).createdId;
    if (id) { qc.invalidateQueries({ queryKey: ["collections"] }); cb.onFail?.(id); }
    throw e;
  }), { invalidate: INV_COLL, success: "Colección guardada", onSuccess: (c) => { qc.setQueryData(["collection", c.id], c); cb.onSaved(c); } });
};
export const useDeleteCollection = (onDone?: () => void) => useAction((id: string) => voidOk(api.delete(`/admin/collections/${id}`)), { invalidate: INV_COLL.filter((k) => k[0] !== "collection"), success: "Colección eliminada", onSuccess: onDone });

/* ====================================================================================================
 * Ubicaciones e inventario
 * ================================================================================================== */
export interface Location { id: string; name: string; isDefault: boolean; isActive: boolean }
export const useLocations = () => useApi<Location[]>(["locations"], "/admin/locations");
export const useSaveLocation = () =>
  useAction(({ id, name, isActive, isDefault, replacementDefaultId }: Partial<Location> & { name: string; replacementDefaultId?: string }) => {
    if (!name.trim()) throw new Error("El nombre es obligatorio");
    return id ? api.patch(`/admin/locations/${id}`, { name: name.trim(), isActive, isDefault, replacementDefaultId: replacementDefaultId || undefined }) : api.post("/admin/locations", { name: name.trim() });
  }, { invalidate: [["locations"], ["levels"]], success: "Ubicación guardada" });
export const useDeleteLocation = () => useAction((id: string) => voidOk(api.delete(`/admin/locations/${id}`)), { invalidate: [["locations"], ["levels"]], success: "Ubicación eliminada" });

export interface StockLevel { id: string; variantId: string; variantTitle: string; sku: string; locationId: string; location: string; onHand: number; reserved: number; available: number; lowStock: boolean }
interface ApiLevel { id: string; variantId: string; variantTitle: string; variantSku: string | null; locationId: string; locationName: string; onHand: number; reserved: number; lowStock: boolean }
export interface LevelFilters { q: string; locationId: string; lowStock: boolean; page: number }
/** El umbral se envía explícito (`lowStockThreshold`): es el mismo valor por defecto del backend (5), así filtro y marca de "stock bajo" coinciden. */
export const useLevels = (f: LevelFilters) =>
  useApi<Page<ApiLevel>, Page<StockLevel>>(["levels"], "/admin/inventory", {
    query: { page: f.page, pageSize: 25, q: f.q.trim(), locationId: f.locationId, lowStock: f.lowStock ? "true" : undefined, lowStockThreshold: f.lowStock ? LOW_STOCK_THRESHOLD : undefined },
    select: (d) => ({ ...d, items: d.items.map((l) => ({ id: l.id, variantId: l.variantId, variantTitle: l.variantTitle, sku: l.variantSku ?? "", locationId: l.locationId, location: l.locationName, onHand: l.onHand, reserved: l.reserved, available: l.onHand - l.reserved, lowStock: l.lowStock })) }),
  });
export const ADJUST_REASONS: Record<string, string> = { received: "Recepción de mercancía", correction: "Corrección / conteo físico", restock: "Reabastecimiento", returned: "Devolución", damaged: "Daño o pérdida", sold: "Venta fuera de línea", other: "Otro" };
export const useAdjustStock = () =>
  useAction((v: { variantId: string; locationId: string; delta?: number; setTo?: number; reason: string; note?: string }) =>
    api.post("/admin/inventory/adjust", { variantId: v.variantId, locationId: v.locationId, ...(v.setTo !== undefined ? { setTo: v.setTo } : { delta: v.delta }), reason: v.reason, note: v.note?.trim() || undefined }),
  { invalidate: [["levels"], ["adjustments"], ["products"], ["product"], ["alerts"]], success: "Stock ajustado" });

export interface StockAdjustment { id: string; variantId: string; variantTitle: string; locationId: string; delta: number; reason: string; note: string; actorId: string | null; at: string }
interface ApiAdjustment { id: string; variantId: string; variantTitle: string | null; locationId: string; delta: number; reason: string; note: string | null; actorId: string | null; createdAt: string }
/** Historial de ajustes con paginación por cursor ("Cargar más"). */
export const useAdjustments = () =>
  useInfiniteQuery({
    queryKey: ["adjustments"], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<{ items: ApiAdjustment[]; nextCursor: string | null; hasMore: boolean }>("/admin/inventory/adjustments", { query: { limit: 25, cursor: pageParam } }),
    getNextPageParam: (l) => (l.hasMore ? l.nextCursor ?? undefined : undefined),
    select: (d) => d.pages.flatMap((p) => p.items).map((a): StockAdjustment => ({ id: a.id, variantId: a.variantId, variantTitle: a.variantTitle ?? "—", locationId: a.locationId, delta: a.delta, reason: a.reason, note: a.note ?? "", actorId: a.actorId, at: a.createdAt })),
  });
/** Nombres del personal (id → nombre) para el historial de inventario. Solo se consulta con permiso `staff:read`; sin él el historial muestra "Equipo". */
export const useStaffNames = (enabled: boolean) =>
  useQuery({ queryKey: ["staff-names"], enabled, staleTime: 5 * 60_000, retry: 1, queryFn: async () => new Map((await fetchAll<{ id: string; fullName: string }>("/admin/staff", 20)).items.map((s) => [s.id, s.fullName])) });
