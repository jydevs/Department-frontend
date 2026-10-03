/** Catálogo de la tienda desde la API (servidor). Convierte los DTO del backend al modelo de UI (`@/data/types`). */
import type { Collection, Product, ProductBadge, ProductVariant } from "@/data/types";
import { CATALOG_REVALIDATE } from "./config";
import { fromSummary } from "./map";
import { sfGet } from "./server";
import type { ApiCollectionPage, ApiCollectionSummary, ApiProductDetails, ApiProductSummary, ApiVariant, Cursor } from "./types";

const TAGS = { products: "catalog:products", collections: "catalog:collections" };
const SIZE_OPTION = /^(talla|size)$/i;

/** Quita etiquetas HTML para usarlo como texto plano (SEO). El HTML ya viene saneado por el backend. */
export function plainText(html: string, max = 200): string {
  const t = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const sizeOf = (v: ApiVariant): string => v.optionValues.find((o) => SIZE_OPTION.test(o.name))?.value ?? v.optionValues[0]?.value ?? v.title;

function toVariant(v: ApiVariant): ProductVariant {
  return { id: v.id, size: sizeOf(v), price: v.price, compareAtPrice: v.compareAtPrice != null && v.compareAtPrice > v.price ? v.compareAtPrice : undefined, available: v.available };
}

/** HTML (ya saneado por el backend) → texto con párrafos separados por línea en blanco. No se inyecta HTML en la tienda. */
export function htmlToParagraphs(html: string, max = 1500): string {
  const t = html
    .replace(/<\/(p|h[1-6]|li|ul|ol)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function toProduct(d: ApiProductDetails, summary?: ApiProductSummary): Product {
  const variants = d.variants.map(toVariant);
  const available = variants.some((v) => v.available);
  const sale = variants.filter((v) => v.compareAtPrice !== undefined);
  const cheapest = variants.length ? Math.min(...variants.map((v) => v.price)) : (summary?.price ?? 0);
  const badge: ProductBadge | undefined = !available ? "agotado" : sale.length ? "oferta" : undefined;
  const images = d.media.map((m) => m.url);
  return {
    id: d.id,
    handle: d.handle,
    name: d.title,
    price: cheapest,
    compareAtPrice: sale.length ? Math.min(...sale.map((v) => v.compareAtPrice as number)) : undefined,
    badge,
    tags: d.tags,
    imageLabel: d.media[0]?.alt || d.title,
    images: images.length ? images : summary?.image ? [summary.image.url] : [],
    sizes: [...new Set(variants.map((v) => v.size))],
    variants,
    description: htmlToParagraphs(d.descriptionHtml) || d.seo.description || "",
    descriptionHtml: d.descriptionHtml,
  };
}

export async function getProduct(handle: string): Promise<Product | null> {
  const d = await sfGet<ApiProductDetails>(`/storefront/products/${encodeURIComponent(handle)}`, { tags: [TAGS.products, `catalog:product:${handle}`], revalidate: CATALOG_REVALIDATE, allow404: true });
  return d ? toProduct(d) : null;
}

/** Enriquece los resúmenes con el detalle (tallas, oferta, 2.ª foto): una petición cacheada por producto. */
async function enrich(items: ApiProductSummary[]): Promise<Product[]> {
  return Promise.all(items.map(async (s) => (await getProduct(s.handle)) ?? fromSummary(s)));
}

export async function getProducts(opts: { collection?: string; tag?: string; sort?: "newest" | "price_asc" | "price_desc" | "title"; limit?: number } = {}): Promise<Product[]> {
  const page = await sfGet<Cursor<ApiProductSummary>>("/storefront/products", {
    tags: [TAGS.products], revalidate: CATALOG_REVALIDATE,
    query: { collection: opts.collection, tag: opts.tag, sort: opts.sort, limit: opts.limit ?? 24 },
  });
  return enrich(page?.items ?? []);
}

export function toCollection(c: ApiCollectionSummary & { descriptionHtml?: string }): Collection {
  return { handle: c.handle, title: c.title, heroImageLabel: c.image?.alt || c.title, heroImage: c.image?.url, description: c.descriptionHtml ? plainText(c.descriptionHtml) : undefined };
}

export async function getCollections(): Promise<Collection[]> {
  const list = await sfGet<ApiCollectionSummary[]>("/storefront/collections", { tags: [TAGS.collections], revalidate: CATALOG_REVALIDATE });
  return (list ?? []).map(toCollection);
}

/** Colección + todos sus productos (hasta 100). */
export async function getCollection(handle: string): Promise<{ collection: Collection; products: Product[] } | null> {
  const page = await sfGet<ApiCollectionPage>(`/storefront/collections/${encodeURIComponent(handle)}`, {
    tags: [TAGS.collections, TAGS.products], revalidate: CATALOG_REVALIDATE, allow404: true, query: { limit: 100 },
  });
  if (!page) return null;
  return { collection: toCollection(page.collection), products: await enrich(page.products.items) };
}

/** Solo el número de piezas de una colección (sin enriquecer con el detalle de cada producto). */
export async function getCollectionCount(handle: string): Promise<number> {
  try {
    const page = await sfGet<ApiCollectionPage>(`/storefront/collections/${encodeURIComponent(handle)}`, {
      tags: [TAGS.collections, TAGS.products], revalidate: CATALOG_REVALIDATE, allow404: true, query: { limit: 100 },
    });
    return page?.products.items.length ?? 0;
  } catch {
    return 0;
  }
}

/** Productos relacionados: mismas etiquetas primero; si faltan, los más nuevos. */
export async function getRelatedProducts(product: Product, tags: string[], limit = 4): Promise<Product[]> {
  const out: Product[] = [];
  const seen = new Set([product.handle]);
  for (const tag of [...tags, undefined]) {
    if (out.length >= limit) break;
    const found = await getProducts({ tag, limit: limit + 2 });
    for (const p of found) if (!seen.has(p.handle) && out.length < limit) { seen.add(p.handle); out.push(p); }
  }
  return out;
}

/** Handles para `generateStaticParams`; devuelve [] si la API no está disponible en el build. */
export async function listProductHandles(): Promise<string[]> {
  try {
    const page = await sfGet<Cursor<ApiProductSummary>>("/storefront/products", { query: { limit: 100 }, revalidate: CATALOG_REVALIDATE });
    return (page?.items ?? []).map((p) => p.handle);
  } catch {
    return [];
  }
}
export async function listCollectionHandles(): Promise<string[]> {
  try {
    return (await getCollections()).map((c) => c.handle);
  } catch {
    return [];
  }
}
