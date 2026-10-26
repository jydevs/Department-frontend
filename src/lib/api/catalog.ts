/** Catálogo de la tienda desde la API (servidor). Convierte los DTO del backend al modelo de UI (`@/data/types`). */
import { cache } from "react";
import type { Collection, Product } from "@/data/types";
import { CATALOG_REVALIDATE } from "./config";
import { mapLimit } from "./limit";
import { fromSummary, isRich, pricing, toVariant } from "./map";
import { sfGet } from "./server";
import type { ApiCollectionPage, ApiCollectionSummary, ApiProductDetails, ApiProductSummary, Cursor } from "./types";

const TAGS = { products: "catalog:products", collections: "catalog:collections" };

/** Peticiones de detalle simultáneas (solo con un backend antiguo cuyo listado no trae variantes). */
const DETAIL_CONCURRENCY = 6;
/** Máximo de tarjetas que se completan con su detalle (solo backend antiguo); el resto usa los datos del listado. */
const ENRICH_LIMIT = 24;
/** Tamaño de página del catálogo (máximo de la API). */
const PAGE_SIZE = 100;

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decode = (s: string) => s.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

/** Quita etiquetas HTML para usarlo como texto plano (SEO). El HTML ya viene saneado por el backend. */
export function plainText(html: string, max = 200): string {
  const t = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** HTML (ya saneado por el backend) → texto con párrafos separados por línea en blanco. No se inyecta HTML en la tienda. */
function htmlToParagraphs(html: string, max = 1500): string {
  const t = decode(html.replace(/<\/(p|h[1-6]|li|ul|ol)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toProduct(d: ApiProductDetails, summary?: ApiProductSummary): Product {
  const options = d.options.map((o) => ({ name: o.name, values: o.values }));
  const names = options.map((o) => o.name);
  const variants = d.variants.map((v) => toVariant(v, (name) => v.optionValues.find((o) => o.name === name)?.value ?? "", names));
  // precio y precio anterior SIEMPRE de la misma variante (no se mezcla el mínimo de una con el compareAt de otra)
  const { price, compareAtPrice, badge } = pricing(variants, summary?.price);
  const images = d.media.map((m) => m.url);
  return {
    id: d.id,
    handle: d.handle,
    name: d.title,
    price,
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
 * Productos de UI a partir de un listado. El backend actual ya trae tallas, oferta, fotos y variantes en cada item, así que NO se
 * pide el detalle. Solo si un item no las trae (backend antiguo) o su lista de variantes pudo truncarse, se completa con el
 * detalle (cacheado, concurrencia limitada y solo las primeras tarjetas).
 */
async function enrich(items: ApiProductSummary[]): Promise<Product[]> {
  let detailed = 0;
  return mapLimit(items, DETAIL_CONCURRENCY, async (s) => {
    if (isRich(s) || s.variants?.length === 0 || detailed >= ENRICH_LIMIT) return fromSummary(s);
    detailed++;
    return (await getProduct(s.handle)) ?? fromSummary(s);
  });
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "title";

const listPage = cache(async (collection: string | undefined, tag: string | undefined, sort: ProductSort | undefined, limit: number): Promise<Cursor<ApiProductSummary>> =>
  (await sfGet<Cursor<ApiProductSummary>>("/storefront/products", { tags: [TAGS.products], revalidate: CATALOG_REVALIDATE, query: { collection, tag, sort, limit } })) ?? { items: [], nextCursor: null, hasMore: false });

export async function getProducts(opts: { collection?: string; tag?: string; sort?: ProductSort; limit?: number } = {}): Promise<Product[]> {
  const page = await listPage(opts.collection, opts.tag, opts.sort, opts.limit ?? 24);
  return enrich(page.items);
}

function toCollection(c: ApiCollectionSummary & { descriptionHtml?: string; seo?: { title: string | null; description: string | null }; updatedAt?: string }): Collection {
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
 * Productos relacionados: mismas etiquetas primero; solo si faltan se pide el listado de los más nuevos (una petición
 * normalmente, dos como máximo). Los items del listado ya traen todo lo necesario para la tarjeta.
 */
export async function getRelatedProducts(product: Product, tags: string[], limit = 4): Promise<Product[]> {
  const seen = new Set([product.handle]);
  const picked: ApiProductSummary[] = [];
  for (const tag of [...(tags[0] ? [tags[0]] : []), undefined]) {
    if (picked.length >= limit) break;
    for (const p of (await listPage(undefined, tag, undefined, limit + 2)).items) if (!seen.has(p.handle) && picked.length < limit) { seen.add(p.handle); picked.push(p); }
  }
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
