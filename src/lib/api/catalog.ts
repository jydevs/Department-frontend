/** Catálogo de la tienda desde la API (servidor). Convierte los DTO del backend al modelo de UI (`@/data/types`). */
import { cache } from "react";
import type { Collection, Product, ProductBadge, ProductVariant } from "@/data/types";
import { CATALOG_REVALIDATE } from "./config";
import { mapLimit } from "./limit";
import { fromSummary } from "./map";
import { sfGet } from "./server";
import type { ApiCollectionPage, ApiCollectionSummary, ApiProductDetails, ApiProductSummary, ApiVariant, Cursor } from "./types";

const TAGS = { products: "catalog:products", collections: "catalog:collections" };

/** Peticiones de detalle simultáneas (el listado no trae tallas, oferta ni 2.ª foto). */
const DETAIL_CONCURRENCY = 6;
/** Máximo de tarjetas de una página que se enriquecen con su detalle; el resto usa los datos del listado. */
const ENRICH_LIMIT = 24;
/** Tamaño de página del catálogo (máximo de la API). */
export const PAGE_SIZE = 100;

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decode = (s: string) => s.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

/** Quita etiquetas HTML para usarlo como texto plano (SEO). El HTML ya viene saneado por el backend. */
export function plainText(html: string, max = 200): string {
  const t = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** HTML (ya saneado por el backend) → texto con párrafos separados por línea en blanco. No se inyecta HTML en la tienda. */
export function htmlToParagraphs(html: string, max = 1500): string {
  const t = decode(html.replace(/<\/(p|h[1-6]|li|ul|ol)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toVariant(v: ApiVariant, optionNames: string[]): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    // un valor por opción, en el orden de las opciones del producto (sin colapsar variantes distintas)
    values: optionNames.map((name) => v.optionValues.find((o) => o.name === name)?.value ?? ""),
    price: v.price,
    compareAtPrice: v.compareAtPrice != null && v.compareAtPrice > v.price ? v.compareAtPrice : undefined,
    available: v.available,
    sku: v.sku ?? undefined,
  };
}

/** Variante que representa al producto en tarjetas y "desde": la más barata (entre las disponibles si hay alguna); a igual precio, la que está en oferta. */
function representative(variants: ProductVariant[]): ProductVariant | undefined {
  const pool = variants.some((v) => v.available) ? variants.filter((v) => v.available) : variants;
  return pool.reduce<ProductVariant | undefined>(
    (best, v) => (!best || v.price < best.price || (v.price === best.price && v.compareAtPrice !== undefined && best.compareAtPrice === undefined) ? v : best),
    undefined,
  );
}

export function toProduct(d: ApiProductDetails, summary?: ApiProductSummary): Product {
  const options = d.options.map((o) => ({ name: o.name, values: o.values }));
  const variants = d.variants.map((v) => toVariant(v, options.map((o) => o.name)));
  const available = variants.some((v) => v.available);
  // precio y precio anterior SIEMPRE de la misma variante (no se mezcla el mínimo de una con el compareAt de otra)
  const rep = representative(variants);
  const compareAtPrice = rep?.compareAtPrice;
  const badge: ProductBadge | undefined = !available ? "agotado" : compareAtPrice !== undefined ? "oferta" : undefined;
  const images = d.media.map((m) => m.url);
  return {
    id: d.id,
    handle: d.handle,
    name: d.title,
    price: rep?.price ?? summary?.price ?? 0,
    compareAtPrice,
    badge,
    tags: d.tags,
    imageLabel: d.media[0]?.alt || d.title,
    images: images.length ? images : summary?.image ? [summary.image.url] : [],
    options,
    variants,
    description: htmlToParagraphs(d.descriptionHtml) || d.seo.description || "",
    descriptionHtml: d.descriptionHtml,
    seoTitle: d.seo.title ?? undefined,
    seoDescription: d.seo.description ?? undefined,
    updatedAt: d.updatedAt,
  };
}

/** Ficha de producto (`null` si no existe o el handle no es válido). Una sola petición por producto y por render. */
export const getProduct = cache(async (handle: string): Promise<Product | null> => {
  const d = await sfGet<ApiProductDetails>(`/storefront/products/${encodeURIComponent(handle)}`, { tags: [TAGS.products, `catalog:product:${handle}`], revalidate: CATALOG_REVALIDATE, allow404: true });
  return d ? toProduct(d) : null;
});

/**
 * Enriquece los resúmenes del listado con el detalle (tallas, oferta, 2.ª foto): una petición cacheada por producto,
 * con concurrencia limitada y solo para las primeras tarjetas; el resto se muestra con los datos del listado.
 */
async function enrich(items: ApiProductSummary[]): Promise<Product[]> {
  return mapLimit(items, DETAIL_CONCURRENCY, async (s, i) => (i < ENRICH_LIMIT ? ((await getProduct(s.handle)) ?? fromSummary(s)) : fromSummary(s)));
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "title";

const listPage = cache(async (collection: string | undefined, tag: string | undefined, sort: ProductSort | undefined, limit: number): Promise<Cursor<ApiProductSummary>> =>
  (await sfGet<Cursor<ApiProductSummary>>("/storefront/products", { tags: [TAGS.products], revalidate: CATALOG_REVALIDATE, query: { collection, tag, sort, limit } })) ?? { items: [], nextCursor: null, hasMore: false });

export async function getProducts(opts: { collection?: string; tag?: string; sort?: ProductSort; limit?: number } = {}): Promise<Product[]> {
  const page = await listPage(opts.collection, opts.tag, opts.sort, opts.limit ?? 24);
  return enrich(page.items);
}

export function toCollection(c: ApiCollectionSummary & { descriptionHtml?: string; seo?: { title: string | null; description: string | null }; updatedAt?: string }): Collection {
  return {
    handle: c.handle, title: c.title, heroImageLabel: c.image?.alt || c.title, heroImage: c.image?.url,
    description: c.descriptionHtml ? plainText(c.descriptionHtml) : undefined,
    seoTitle: c.seo?.title ?? undefined, seoDescription: c.seo?.description ?? undefined, updatedAt: c.updatedAt,
  };
}

export const getCollections = cache(async (): Promise<Collection[]> => {
  const list = await sfGet<ApiCollectionSummary[]>("/storefront/collections", { tags: [TAGS.collections], revalidate: CATALOG_REVALIDATE });
  return (list ?? []).map(toCollection);
});

/** Primera página (hasta 100) de una colección, sin enriquecer. La misma URL sirve a la ficha, a los contadores y a la cabecera (una sola petición cacheada). */
const getCollectionRaw = cache((handle: string) =>
  sfGet<ApiCollectionPage>(`/storefront/collections/${encodeURIComponent(handle)}`, { tags: [TAGS.collections, TAGS.products], revalidate: CATALOG_REVALIDATE, allow404: true, query: { limit: PAGE_SIZE } }),
);

export interface CollectionData { collection: Collection; products: Product[]; /** hay más piezas que las cargadas */ hasMore: boolean; nextCursor: string | null }

/** Colección + sus productos (primera página de hasta 100; `hasMore`/`nextCursor` para seguir paginando). */
export async function getCollection(handle: string, opts: { limit?: number } = {}): Promise<CollectionData | null> {
  const page = await getCollectionRaw(handle);
  if (!page) return null;
  const items = opts.limit ? page.products.items.slice(0, opts.limit) : page.products.items;
  return { collection: toCollection(page.collection), products: await enrich(items), hasMore: page.products.hasMore || items.length < page.products.items.length, nextCursor: page.products.nextCursor };
}

/** Datos de la colección sin sus productos (metadatos, JSON-LD de migas…). */
export async function getCollectionInfo(handle: string): Promise<Collection | null> {
  const page = await getCollectionRaw(handle);
  return page ? toCollection(page.collection) : null;
}

/** Número total de piezas de una colección, sin enriquecer (pagina con el cursor solo si hay más de 100). */
export async function getCollectionCount(handle: string): Promise<number | null> {
  const first = await getCollectionRaw(handle);
  if (!first) return null;
  let total = first.products.items.length;
  let cursor = first.products.hasMore ? first.products.nextCursor : null;
  for (let pages = 1; cursor && pages < 20; pages++) {
    const next: ApiCollectionPage | null = await sfGet<ApiCollectionPage>(`/storefront/collections/${encodeURIComponent(handle)}`, { tags: [TAGS.collections, TAGS.products], revalidate: CATALOG_REVALIDATE, allow404: true, query: { limit: PAGE_SIZE, cursor } });
    if (!next) break;
    total += next.products.items.length;
    cursor = next.products.hasMore ? next.products.nextCursor : null;
  }
  return total;
}

/** Número de productos del catálogo (solo se usa si no existe la colección "all"). */
export async function countAllProducts(): Promise<number> {
  return (await listPage(undefined, undefined, undefined, PAGE_SIZE)).items.length;
}

/**
 * Productos relacionados: mismas etiquetas primero; si faltan, los más nuevos. Dos listados como máximo (en paralelo)
 * y solo se piden los detalles de las piezas elegidas.
 */
export async function getRelatedProducts(product: Product, tags: string[], limit = 4): Promise<Product[]> {
  const lists = await Promise.all([...(tags[0] ? [tags[0]] : []), undefined].map((tag) => listPage(undefined, tag, undefined, limit + 2)));
  const seen = new Set([product.handle]);
  const picked: ApiProductSummary[] = [];
  for (const list of lists) for (const p of list.items) if (!seen.has(p.handle) && picked.length < limit) { seen.add(p.handle); picked.push(p); }
  return enrich(picked);
}

/** Todos los handles de productos (pagina con el cursor). Para sitemap y `generateStaticParams`: en el build los fallos se lanzan tal cual. */
export async function listProductHandles(): Promise<string[]> {
  const handles: string[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < 100; pages++) {
    const page: Cursor<ApiProductSummary> | null = await sfGet<Cursor<ApiProductSummary>>("/storefront/products", { revalidate: CATALOG_REVALIDATE, bail: false, tags: [TAGS.products], query: { limit: PAGE_SIZE, cursor } });
    if (!page) break;
    handles.push(...page.items.map((p) => p.handle));
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return handles;
}

/** Handles de colecciones para `generateStaticParams` (los fallos de la API se lanzan: el llamador decide). */
export async function listCollectionHandles(): Promise<string[]> {
  const list = await sfGet<ApiCollectionSummary[]>("/storefront/collections", { tags: [TAGS.collections], revalidate: CATALOG_REVALIDATE, bail: false });
  return (list ?? []).map((c) => c.handle);
}
