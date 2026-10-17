import {
  getCollection as apiGetCollection,
  getProduct as apiGetProduct,
  listProducts as apiListProducts,
} from "@/lib/api/catalog";
import { resolveMediaUrl } from "@/lib/api/media";
import type { ApiCollection, ApiProduct, ApiProductSummary, ApiVariant } from "@/lib/api/types";
import { htmlToText, sanitizeHtml } from "./html";
import type { Product, ProductVariant } from "./types";

/** Cards enriched with their detail (hover photo, sizes, sale price) – more than this fall back to list data. */
const MAX_ENRICHED = 48;
const ENRICH_CONCURRENCY = 8;
const DEFAULT_VARIANT_TITLES = new Set(["default title", "default", "título predeterminado"]);

function imageUrls(urls: (string | null | undefined)[]): string[] {
  return urls.flatMap((u) => {
    const resolved = resolveMediaUrl(u);
    return resolved ? [resolved] : [];
  });
}

function variantLabel(variant: ApiVariant): string {
  const fromOptions = variant.optionValues.map((o) => o.value).filter(Boolean).join(" / ");
  return fromOptions || variant.title;
}

function mapVariant(variant: ApiVariant): ProductVariant {
  const compare = variant.compareAtPrice;
  return {
    id: variant.id,
    label: variantLabel(variant),
    price: variant.price,
    compareAtPrice: compare != null && compare > variant.price ? compare : undefined,
    available: variant.available,
  };
}

/** Card-level product from a list / search entry (no variants known). */
export function mapSummary(summary: ApiProductSummary): Product {
  const image = resolveMediaUrl(summary.image?.url);
  const compare = summary.compareAtPrice;
  const onSale = compare != null && compare > summary.price;
  return {
    handle: summary.handle,
    name: summary.title,
    price: summary.price,
    compareAtPrice: onSale ? compare : undefined,
    badge: !summary.available ? "agotado" : onSale ? "oferta" : undefined,
    imageLabel: summary.image?.alt || summary.title,
    images: image ? [image] : [],
    sizes: [],
    variants: [],
    available: summary.available,
    description: "",
    needsSize: false,
    tags: [],
    metafields: [],
  };
}

/** Full product from `GET /storefront/products/:handle`. */
export function mapProduct(api: ApiProduct): Product {
  const variants = api.variants.map(mapVariant);
  const available = variants.some((v) => v.available);
  // the headline price is the cheapest variant that can be bought (or the cheapest overall when sold out)
  const pool = variants.filter((v) => v.available);
  const cheapest = (pool.length > 0 ? pool : variants).reduce<ProductVariant | null>(
    (best, v) => (best === null || v.price < best.price ? v : best),
    null,
  );
  const price = cheapest?.price ?? 0;
  const compareAtPrice = cheapest?.compareAtPrice;
  const media = api.media ?? [];
  const images = imageUrls(media.map((m) => m.url));
  const needsSize =
    variants.length > 1 || (variants.length === 1 && !DEFAULT_VARIANT_TITLES.has(variants[0].label.trim().toLowerCase()));

  return {
    handle: api.handle,
    name: api.title,
    price,
    compareAtPrice,
    badge: !available ? "agotado" : compareAtPrice != null ? "oferta" : undefined,
    imageLabel: media[0]?.alt || api.title,
    images,
    sizes: variants.map((v) => v.label),
    variants,
    available,
    description: htmlToText(api.descriptionHtml),
    descriptionHtml: api.descriptionHtml ? sanitizeHtml(api.descriptionHtml) : undefined,
    needsSize,
    vendor: api.vendor ?? undefined,
    productType: api.productType ?? undefined,
    tags: api.tags ?? [],
    metafields: (api.metafields ?? []).filter((m) => typeof m.key === "string" && typeof m.value === "string"),
  };
}

/** One product by handle, or null when it does not exist. Throws ApiError when the API is down. */
export async function getProductView(handle: string): Promise<Product | null> {
  const api = await apiGetProduct(handle);
  return api ? mapProduct(api) : null;
}

/**
 * List entries only carry the main photo and the lowest price. Cards also need the hover photo,
 * the sizes (quick-add) and the compare-at price, so each entry is completed with its (cached)
 * product detail. Failures degrade to the list data instead of failing the page.
 */
export async function enrichSummaries(summaries: ApiProductSummary[]): Promise<Product[]> {
  const result: Product[] = summaries.map(mapSummary);
  const targets = Math.min(summaries.length, MAX_ENRICHED);
  for (let start = 0; start < targets; start += ENRICH_CONCURRENCY) {
    const end = Math.min(start + ENRICH_CONCURRENCY, targets);
    await Promise.all(
      summaries.slice(start, end).map(async (summary, offset) => {
        try {
          const detail = await apiGetProduct(summary.handle);
          if (detail) result[start + offset] = mapProduct(detail);
        } catch {
          /* keep the list entry */
        }
      }),
    );
  }
  return result;
}

export interface CollectionView {
  collection: ApiCollection;
  products: Product[];
  /** total products returned (≤ limit) */
  count: number;
  /** resolved cover photo of the collection */
  heroImage?: string;
}

/** Collection + its products (enriched). Null when the collection does not exist. */
export async function getCollectionView(handle: string, limit = 100): Promise<CollectionView | null> {
  const cap = Math.min(Math.max(1, Math.floor(limit)), 100);
  const first = await apiGetCollection(handle, { limit: cap });
  if (!first) return null;
  const items = first.products.items.slice(0, limit);
  return {
    collection: first.collection,
    products: await enrichSummaries(items),
    count: items.length,
    heroImage: resolveMediaUrl(first.collection.image?.url) ?? undefined,
  };
}

/** Number of products in a collection (the "NN piezas" counters). 0 when unknown. */
export async function getCollectionCount(handle: string): Promise<number> {
  try {
    const page = await apiGetCollection(handle, { limit: 100 });
    return page ? page.products.items.length : 0;
  } catch {
    return 0;
  }
}

/** Products of a collection as list entries (no enrichment). */
export async function getCollectionSummaries(handle: string, limit: number): Promise<ApiProductSummary[]> {
  try {
    const page = await apiGetCollection(handle, { limit: Math.min(Math.max(1, limit), 100) });
    return page ? page.products.items.slice(0, limit) : [];
  } catch {
    return [];
  }
}

/** "You may also like": other products ranked by shared tags (men / women / campaign), catalogue order on ties. */
export async function getRelatedProducts(current: Product, limit: number): Promise<Product[]> {
  const page = await apiListProducts({ limit: 100 });
  const mine = new Set(current.tags.map((t) => t.toLowerCase()));
  // tags are only known for the current product: rank the others by detail when they are few, else keep order
  const others = page.items.filter((p) => p.handle !== current.handle);
  const detailed = await enrichSummaries(others.slice(0, MAX_ENRICHED));
  const shared = (p: Product) => p.tags.filter((t) => mine.has(t.toLowerCase())).length;
  const ranked = detailed
    .map((product, index) => ({ product, index, score: shared(product) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.product);
  return ranked.slice(0, limit);
}

/** First `limit` products that can still be bought (search "Más buscado"). */
export async function getPopularProducts(limit: number): Promise<Product[]> {
  try {
    const page = await apiListProducts({ limit: 100 });
    const available = page.items.filter((p) => p.available).slice(0, limit);
    return await enrichSummaries(available);
  } catch {
    return [];
  }
}
