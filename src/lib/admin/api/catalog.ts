"use client";
/**
 * Catálogo del panel contra la API real: productos, colecciones, inventario y ubicaciones.
 * Rutas: /admin/products, /admin/collections, /admin/inventory, /admin/locations (+ metafields).
 * Los precios son enteros en COP (sin decimales). El detalle del producto NO incluye stock: se gestiona en Inventario.
 */
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import { ApiError } from "../errors";
import { slugify, uid } from "../format";
import { useAction, useApi } from "../query";
import type { Page, ProductStatus } from "../types";

/* ====================================================================================================
 * DTOs de la API (solo lo que usa el panel)
 * ================================================================================================== */
interface ApiMedia { id: string; url: string; alt: string | null }
interface ApiOptionValue { id: string; value: string; position: number }
interface ApiOption { id: string; name: string; position: number; values: ApiOptionValue[] }
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

/* ====================================================================================================
 * Productos: lectura
 * ================================================================================================== */
export interface ProductFilters { q: string; status: string; tag: string; vendor: string; page: number }
const PAGE = 20;
export const useProducts = (f: ProductFilters) =>
  useApi<Page<ApiProductItem>, Page<ProductListItem>>(["products"], "/admin/products", {
    query: { page: f.page, pageSize: PAGE, q: f.q.trim(), status: f.status, tag: f.tag.trim(), vendor: f.vendor.trim() },
    select: (d) => ({ ...d, items: d.items.map((p) => ({ id: p.id, handle: p.handle, title: p.title, status: p.status, variantCount: p.variantCount, inventoryTotal: p.inventoryTotal ?? 0, minPrice: p.minPrice, image: p.primaryImage ? { url: p.primaryImage.url, alt: p.primaryImage.alt ?? "" } : null })) }),
  });

/** Recorre las páginas de un listado (máx. `max` páginas de 100). */
async function fetchAll<T>(path: string, max = 5): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= max; page++) {
    const r = await api.get<Page<T>>(path, { query: { page, pageSize: 100 } });
    out.push(...r.items);
    if (page >= r.totalPages) break;
  }
  return out;
}
const lite = (p: { id: string; handle: string; title: string; image?: { url: string } | null }): ProductLite => ({ id: p.id, handle: p.handle, title: p.title, image: p.image?.url ?? "" });
/** Todos los productos (hasta 500) para selectores. */
export const useAllProducts = () => useQuery({ queryKey: ["products-all"], queryFn: async () => (await fetchAll<ApiProductItem>("/admin/products")).map((p) => lite({ ...p, image: p.primaryImage })), staleTime: 60_000 });
/** Búsqueda en el servidor para añadir productos a una colección. */
export const useProductSearch = (q: string) =>
  useQuery({ queryKey: ["product-search", q], enabled: q.trim().length > 0, placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<Page<ApiProductItem>>("/admin/products", { query: { q: q.trim(), pageSize: 8 } })).items.map((p) => lite({ ...p, image: p.primaryImage })) });

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
    images: d.media.map((m) => ({ id: m.id, url: m.url, alt: m.alt ?? "" })), metafields: metafields.map(mapMetafield), updatedAt: d.updatedAt, valueIds,
  };
}
async function loadProduct(id: string): Promise<ProductForm> {
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
 * Productos: escritura (varias llamadas coordinadas)
 * ================================================================================================== */
/** El detalle del producto no expone la `version` de cada variante: se recuerda la última conocida y se sondea al alza ante 409. */
const verCache = new Map<string, number>();
const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409 && e.code === "CONCURRENT_UPDATE";
async function patchVariant(pid: string, vid: string, body: Record<string, unknown>): Promise<void> {
  let v = verCache.get(vid) ?? 0;
  for (let i = 0; i < 80; i++, v++) {
    try {
      const r = await api.patch<{ version: number }>(`/admin/products/${pid}/variants/${vid}`, { ...body, version: v });
      verCache.set(vid, r.version);
      return;
    } catch (e) {
      if (isConflict(e)) continue;
      throw e;
    }
  }
  throw new Error("No se pudo actualizar la variante (conflicto de versión).");
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

function validateProduct(p: ProductForm): void {
  if (!p.title.trim()) throw new Error("El título es obligatorio");
  const handle = p.handle || slugify(p.title);
  if (!HANDLE.test(handle)) throw new Error("Handle inválido (minúsculas, números y guiones)");
  const opts = cleanOptions(p.options);
  if (new Set(opts.map((o) => o.name.toLowerCase())).size !== opts.length) throw new Error("Hay opciones con el mismo nombre");
  if (p.variants.some((v) => v.price < 0 || (v.compareAt !== undefined && v.compareAt < v.price))) throw new Error("Revisa los precios: no pueden ser negativos y el comparado debe ser mayor o igual al precio");
  const skus = p.variants.map((v) => v.sku.trim()).filter(Boolean);
  if (new Set(skus).size !== skus.length) throw new Error("Hay SKU repetidos entre las variantes");
  for (const m of p.metafields.filter((x) => !x.saved)) {
    if (!m.key.trim() && !m.value.trim()) continue;
    if (!META_KEY.test(m.key.trim()) || !META_KEY.test(m.namespace.trim())) throw new Error(`Metafield inválido “${m.namespace}.${m.key}”: usa letras, números, guiones y guion bajo`);
  }
}

/** Reconcilia variantes deseadas contra las del servidor: crea, modifica y desactiva. */
async function syncVariants(pid: string, desired: VariantForm[], opts: ApiOption[], current: ApiVariant[], matchByTitle: boolean): Promise<void> {
  const idOf = (oi: number, value: string) => opts[oi]?.values.find((x) => x.value === value)?.id;
  const curMap = new Map(current.map((v) => [v.id, v]));
  const claimed = new Set<string>();
  for (const v of desired) {
    const ids = opts.length ? v.options.map((val, oi) => idOf(oi, val)).filter((x): x is string => !!x) : [];
    let cur = curMap.get(v.id);
    if (!cur && matchByTitle) cur = current.find((c) => c.title === v.title && !claimed.has(c.id));
    if (!cur) { const r = await api.post<{ id: string; version: number }>(`/admin/products/${pid}/variants`, variantBody(v, ids)); verCache.set(r.id, r.version); claimed.add(r.id); continue; }
    claimed.add(cur.id);
    const body: Record<string, unknown> = {};
    if (cur.title !== v.title) body.title = v.title;
    if ((cur.sku ?? "") !== v.sku.trim()) body.sku = nullable(v.sku);
    if (cur.price !== v.price) body.price = v.price;
    if ((cur.compareAtPrice ?? undefined) !== v.compareAt) body.compareAtPrice = v.compareAt ?? null;
    if ((cur.weightGrams ?? undefined) !== v.weight) body.weightGrams = v.weight ?? null;
    if ((cur.barcode ?? "") !== v.barcode.trim()) body.barcode = nullable(v.barcode);
    if (cur.trackInventory !== v.tracked) body.trackInventory = v.tracked;
    if (cur.allowBackorder !== v.backorder) body.allowBackorder = v.backorder;
    if (!sameArr(cur.optionValueIds, ids)) body.optionValueIds = ids;
    if (!cur.isActive) body.isActive = true;
    if (Object.keys(body).length) {
      // si hay precio y compareAt a la vez el backend valida con los valores resultantes
      await patchVariant(pid, cur.id, body);
    }
  }
  for (const c of current) if (c.isActive && !claimed.has(c.id)) await voidOk(api.delete(`/admin/products/${pid}/variants/${c.id}`));
}

async function putMetafields(pid: string, list: MetafieldForm[], base: MetafieldForm[]): Promise<void> {
  const prev = new Map(base.map((m) => [`${m.namespace}.${m.key}`, m]));
  const changed = list.filter((m) => m.key.trim() && (!prev.has(`${m.namespace}.${m.key}`) || prev.get(`${m.namespace}.${m.key}`)!.value !== m.value || prev.get(`${m.namespace}.${m.key}`)!.type !== m.type));
  if (changed.length) await api.put(`/admin/products/${pid}/metafields`, { metafields: changed.map((m) => ({ namespace: m.namespace.trim(), key: m.key.trim(), type: m.type, value: m.value })) });
}

async function saveProduct(d: ProductForm, base: ProductForm | null, force: boolean): Promise<ProductForm> {
  validateProduct(d);
  const opts = cleanOptions(d.options);
  const optBody = opts.map((o, i) => ({ name: o.name, position: i, values: o.values.map((value, j) => ({ value, position: j })) }));
  const fields = { title: d.title.trim(), descriptionHtml: d.description, vendor: nullable(d.vendor), productType: nullable(d.type), tags: d.tags, seoTitle: nullable(d.seoTitle), seoDescription: nullable(d.seoDescription) };
  let id: string, detail: ApiProduct;
  if (!base) {
    const handle = d.handle.trim();
    detail = await api.post<ApiProduct>("/admin/products", { ...fields, ...(handle ? { handle } : {}), options: optBody.length ? optBody : undefined, variants: optBody.length ? undefined : d.variants.slice(0, 1).map((v) => variantBody(v, [])) });
    id = detail.id;
    try {
      if (optBody.length) await syncVariants(id, d.variants, detail.options, detail.variants, true);
      await finishProduct(id, d, null, detail.status);
    } catch (e) {
      throw Object.assign(new Error(`El producto se creó, pero faltó guardar algo: ${e instanceof Error ? e.message : "error"}`), { createdId: id });
    }
    return loadProduct(id);
  }
  id = base.id;
  const baseOpts = cleanOptions(base.options);
  let current: ApiProduct | null = null;
  // 1) opciones: primero, porque puede pedir confirmación (force) antes de haber tocado nada
  if (JSON.stringify(opts) !== JSON.stringify(baseOpts)) current = await api.put<ApiProduct>(`/admin/products/${id}/options`, { options: optBody, force });
  // 2) campos del producto (con control de versión)
  const b = base, handle = d.handle.trim();
  const dirty = fields.title !== b.title || fields.descriptionHtml !== b.description || fields.vendor !== nullable(b.vendor) || fields.productType !== nullable(b.type) || !sameArr(fields.tags, b.tags) || fields.seoTitle !== nullable(b.seoTitle) || fields.seoDescription !== nullable(b.seoDescription) || (handle && handle !== b.handle);
  if (dirty) current = await api.patch<ApiProduct>(`/admin/products/${id}`, { ...fields, ...(handle && handle !== b.handle ? { handle } : {}), version: b.version });
  // 3) variantes
  const apiOpts = current?.options ?? null;
  const optionDefs: ApiOption[] = apiOpts ?? (await api.get<ApiProduct>(`/admin/products/${id}`)).options;
  const currentVariants = current?.variants ?? (await api.get<ApiProduct>(`/admin/products/${id}`)).variants;
  await syncVariants(id, d.variants, optionDefs, currentVariants, false);
  await finishProduct(id, d, base, current?.status ?? base.status);
  return loadProduct(id);
}

/** Imágenes, metafields y estado. */
async function finishProduct(id: string, d: ProductForm, base: ProductForm | null, curStatus: ProductStatus): Promise<void> {
  const imgs = (x: ProductForm["images"]) => JSON.stringify(x.map((i) => i.url));
  if (imgs(d.images) !== imgs(base?.images ?? [])) await api.put(`/admin/products/${id}/media`, { media: d.images.map((i) => ({ url: i.url, alt: nullable(i.alt) })) });
  await putMetafields(id, d.metafields.filter((m) => m.key.trim()), base?.metafields ?? []);
  if (d.status !== curStatus) {
    if (d.status === "active") await api.post(`/admin/products/${id}/publish`);
    else if (d.status === "archived") await api.post(`/admin/products/${id}/archive`);
  }
}

const INV_PRODUCT = [["products"], ["products-all"], ["product"], ["product-search"], ["levels"], ["collection"], ["collections"]];
/**
 * Guarda (crea o actualiza) un producto. `confirmForce` se invoca si quitar opciones desactivaría variantes activas.
 * `onConflict` recibe el producto fresco del servidor si hubo 409 o un fallo a medias (para no reintentar cambios ya aplicados).
 */
export const useSaveProduct = (cb: { onSaved: (p: ProductForm) => void; onReset?: (p: ProductForm) => void; confirmForce?: (msg: string) => Promise<boolean> }) => {
  const qc = useQueryClient();
  return useAction(async ({ draft, base }: { draft: ProductForm; base: ProductForm | null }) => {
    try {
      try { return await saveProduct(draft, base, false); } catch (e) {
        if (e instanceof ApiError && e.code === "OPTION_VALUES_IN_USE" && base && cb.confirmForce && await cb.confirmForce("Quitar o renombrar esos valores de opción desactivará las variantes que los usan (se conservarán sus datos si solo renombras). ¿Continuar?")) return await saveProduct(draft, base, true);
        throw e;
      }
    } catch (e) {
      const createdId = (e as { createdId?: string }).createdId;
      if (createdId) { qc.invalidateQueries({ queryKey: ["products"] }); throw e; }
      if (base) {
        const fresh = await loadProduct(base.id).catch(() => null);
        if (fresh) { qc.setQueryData(["product", base.id], fresh); cb.onReset?.(fresh); }
        if (isConflict(e)) throw new Error("El producto cambió mientras lo editabas. Se recargaron los datos guardados: revisa y vuelve a aplicar tus cambios.");
        if (e instanceof ApiError && fresh) throw new Error(`${e.message}. Se recargaron los datos guardados.`);
      }
      throw e;
    }
  }, { invalidate: INV_PRODUCT, success: "Producto guardado", onSuccess: (p) => { qc.setQueryData(["product", p.id], p); cb.onSaved(p); } });
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
export interface CollectionForm {
  id: string; handle: string; title: string; description: string; kind: "manual" | "smart"; published: boolean;
  /** Productos de una colección manual. `membersKnown=false` si la API no permite leerlos (colección oculta). */
  products: ProductLite[]; membersKnown: boolean; rules: Rule[]; match: "all" | "any"; sort: CollectionSort;
  imageMediaId: string | null; seoTitle: string; seoDescription: string; metafields: MetafieldForm[];
}
export interface CollectionItem { id: string; handle: string; title: string; kind: "manual" | "smart"; published: boolean; imageMediaId: string | null }
export const RULE_OPS: Record<Rule["field"], Rule["op"][]> = { tag: ["eq", "neq", "contains"], type: ["eq", "neq", "contains"], vendor: ["eq", "neq", "contains"], price: ["eq", "neq", "gt", "lt"] };

export const useCollections = () =>
  useQuery({ queryKey: ["collections"], queryFn: async () => (await fetchAll<ApiCollection>("/admin/collections", 10)).map((c): CollectionItem => ({ id: c.id, handle: c.handle, title: c.title, kind: c.type, published: c.isPublished, imageMediaId: c.imageMediaId })), staleTime: 30_000 });

const SORTS: CollectionSort[] = ["manual", "newest", "price_asc", "price_desc", "title"];
async function loadMembers(handle: string): Promise<ProductLite[]> {
  const out: ProductLite[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const r = await api.get<{ products: { items: { id: string; handle: string; title: string; image: { url: string } | null }[]; hasMore: boolean; nextCursor: string | null } }>(`/storefront/collections/${encodeURIComponent(handle)}`, { query: { limit: 100, cursor } });
    out.push(...r.products.items.map(lite));
    if (!r.products.hasMore || !r.products.nextCursor) break;
    cursor = r.products.nextCursor;
  }
  return out;
}
async function loadCollection(id: string): Promise<CollectionForm> {
  const [c, m] = await Promise.all([api.get<ApiCollection>(`/admin/collections/${id}`), api.get<{ metafields: ApiMetafield[] }>(`/admin/collections/${id}/metafields`)]);
  // La API de administración no lista los miembros de una colección manual: solo es posible vía tienda (colecciones publicadas).
  let products: ProductLite[] = [], membersKnown = c.type === "smart";
  if (c.type === "manual" && c.isPublished) { products = await loadMembers(c.handle).catch(() => []); membersKnown = true; }
  return {
    id: c.id, handle: c.handle, title: c.title, description: c.descriptionHtml, kind: c.type, published: c.isPublished, products, membersKnown,
    rules: (c.rules?.conditions ?? []).map((x) => ({ field: x.field as Rule["field"], op: x.op as Rule["op"], value: String(x.value) })), match: c.rules?.match ?? "all",
    sort: SORTS.includes(c.sortOrder as CollectionSort) ? (c.sortOrder as CollectionSort) : "manual", imageMediaId: c.imageMediaId, seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "",
    metafields: m.metafields.map(mapMetafield),
  };
}
export const useCollection = (id: string) =>
  useQuery({ queryKey: ["collection", id], queryFn: async () => { try { return await loadCollection(id); } catch (e) { if (e instanceof ApiError && (e.status === 404 || e.code === "VALIDATION_ERROR")) return null; throw e; } } });
export const blankCollection = (): CollectionForm => ({ id: "", handle: "", title: "", description: "", kind: "manual", published: false, products: [], membersKnown: true, rules: [], match: "all", sort: "manual", imageMediaId: null, seoTitle: "", seoDescription: "", metafields: [] });

const rulesBody = (c: Pick<CollectionForm, "rules" | "match">) => ({ match: c.match, conditions: c.rules.map((r) => ({ field: r.field, op: r.op, value: r.field === "price" ? Number(r.value) : r.value.trim() })) });
const rulesValid = (rules: Rule[]) => rules.length > 0 && rules.every((r) => (r.field === "price" ? r.value.trim() !== "" && Number.isSafeInteger(Number(r.value)) && Number(r.value) >= 0 : r.value.trim() !== ""));
export const rulesReady = (c: Pick<CollectionForm, "kind" | "rules">) => c.kind === "smart" && rulesValid(c.rules);

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
  if (!c.title.trim()) throw new Error("El título es obligatorio");
  const handle = c.handle.trim() || slugify(c.title);
  if (!HANDLE.test(handle)) throw new Error("Handle inválido (minúsculas, números y guiones)");
  if (c.kind === "smart" && !rulesValid(c.rules)) throw new Error("Una colección inteligente necesita al menos una regla completa (los precios son enteros)");
  for (const m of c.metafields.filter((x) => !x.saved && (x.key.trim() || x.value.trim()))) if (!META_KEY.test(m.key.trim()) || !META_KEY.test(m.namespace.trim())) throw new Error(`Metafield inválido “${m.namespace}.${m.key}”`);
  const body = { handle, title: c.title.trim(), descriptionHtml: c.description, type: c.kind, rules: c.kind === "smart" ? rulesBody(c) : null, sortOrder: c.sort, seoTitle: nullable(c.seoTitle), seoDescription: nullable(c.seoDescription), imageMediaId: c.imageMediaId, isPublished: c.published };
  const saved = base ? await api.patch<ApiCollection>(`/admin/collections/${base.id}`, body) : await api.post<ApiCollection>("/admin/collections", body);
  try {
    const touched = c.kind === "manual" && (!base || base.kind !== "manual" || (base.membersKnown ? !sameArr(base.products.map((p) => p.id), c.products.map((p) => p.id)) : c.products.length > 0));
    if (touched) await voidOk(api.put(`/admin/collections/${saved.id}/products`, { products: c.products.map((p) => ({ productId: p.id })) }));
    const list = c.metafields.filter((m) => m.key.trim());
    const prev = new Map((base?.metafields ?? []).map((m) => [`${m.namespace}.${m.key}`, m]));
    const changed = list.filter((m) => { const p = prev.get(`${m.namespace}.${m.key}`); return !p || p.value !== m.value || p.type !== m.type; });
    if (changed.length) await api.put(`/admin/collections/${saved.id}/metafields`, { metafields: changed.map((m) => ({ namespace: m.namespace.trim(), key: m.key.trim(), type: m.type, value: m.value })) });
  } catch (e) {
    throw Object.assign(new Error(`La colección se guardó, pero faltó algo: ${e instanceof Error ? e.message : "error"}`), { createdId: saved.id });
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
export const useLevels = (f: LevelFilters) =>
  useApi<Page<ApiLevel>, Page<StockLevel>>(["levels"], "/admin/inventory", {
    query: { page: f.page, pageSize: 25, q: f.q.trim(), locationId: f.locationId, lowStock: f.lowStock ? "true" : undefined },
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
