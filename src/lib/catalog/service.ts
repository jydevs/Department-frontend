import { cache } from "react";
import {
  getCollection as apiGetCollection,
  getProduct as apiGetProduct,
  listProducts as apiListProducts,
} from "@/lib/api/catalog";
import { resolveMediaUrl } from "@/lib/api/media";
import type { ApiCollection, ApiProduct, ApiProductSummary, ApiVariant } from "@/lib/api/types";
import { htmlToText, sanitizeHtml } from "./html";
import type { Product, ProductVariant } from "./types";

/** Products per page of a collection (the API allows up to 100; the grid shows 24 and offers "Ver más"). */
export const COLLECTION_PAGE_SIZE = 24;
/** Pages walked when counting a collection (100 products each): a safety bound, not an expected size. */
const MAX_COUNT_PAGES = 20;
/** The header / tile counters change rarely: they may be 5 minutes old. */
const COUNT_REVALIDATE_SECONDS = 300;
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

/**
 * List entries only carry the main photo and the lowest price. Cards also need the hover photo, the sizes (quick-add)
 * and the compare-at price, so the entries that are SHOWN are completed with their (cached) product detail, all in
 * parallel. Failures degrade to the list data instead of failing the page. Callers pass only what they display.
 * (BACKEND-GAPS.md asks for these fields in the list itself, which would make this step unnecessary.)
 */
export async function enrichSummaries(summaries: ApiProductSummary[]): Promise<Product[]> {
  return Promise.all(
    summaries.map(async (summary) => {
      try {
        const detail = await apiGetProduct(summary.handle);
        return detail ? mapProduct(detail) : mapSummary(summary);
      } catch {
        return mapSummary(summary);
      }
    }),
  );
}

export interface CollectionView {
  collection: ApiCollection;
  /** first page of products (enriched) */
  products: Product[];
  /** REAL number of products in the collection */
  count: number;
  /** cursor of the next page, null when everything is already in `products` */
  nextCursor: string | null;
  /** resolved cover photo of the collection */
  heroImage?: string;
}

/**
 * Number of products in a collection (the "NN piezas" counters). The API has no `total`, so it is counted by walking
 * the list (100 per call – one call for any normal catalogue) and cached for 5 minutes. 0 when unknown.
 */
export const getCollectionCount = cache(async (handle: string): Promise<number> => {
  try {
    let total = 0;
    let cursor: string | undefined;
    for (let i = 0; i < MAX_COUNT_PAGES; i++) {
      const page = await apiListProducts({ collection: handle, limit: 100, cursor }, { revalidate: COUNT_REVALIDATE_SECONDS });
      total += page.items.length;
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return total;
  } catch {
    return 0;
  }
});

/** Collection + the first page of its products (enriched). Null when the collection does not exist. */
export async function getCollectionView(handle: string, pageSize = COLLECTION_PAGE_SIZE): Promise<CollectionView | null> {
  const first = await apiGetCollection(handle, { limit: pageSize });
  if (!first) return null;
  const { items, hasMore, nextCursor } = first.products;
  const [products, count] = await Promise.all([
    enrichSummaries(items),
    hasMore ? getCollectionCount(handle) : Promise.resolve(items.length),
  ]);
  return {
    collection: first.collection,
    products,
    count: Math.max(count, items.length),
    nextCursor: hasMore ? nextCursor : null,
    heroImage: resolveMediaUrl(first.collection.image?.url) ?? undefined,
  };
}

/** A page of a collection (enriched) – the "Ver más" button. */
export async function getCollectionPage(
  handle: string,
  cursor: string,
): Promise<{ products: Product[]; nextCursor: string | null }> {
  // same endpoint (and therefore the same ordering) as the first page: a cursor is only valid for its own sort
  const result = await apiGetCollection(handle, { limit: COLLECTION_PAGE_SIZE, cursor });
  const page = result?.products;
  return { products: await enrichSummaries(page?.items ?? []), nextCursor: page?.hasMore ? page.nextCursor : null };
}

/** Up to `limit` products (of a collection, or of the whole catalogue) as list entries, enriched. Never throws. */
export async function getShowcaseProducts(collection: string | undefined, limit: number): Promise<Product[]> {
  try {
    const page = await apiListProducts({ collection, limit: Math.min(Math.max(1, limit), 100) });
    return await enrichSummaries(page.items.slice(0, limit));
  } catch {
    return [];
  }
}

/**
 * "You may also like": products that share the current product's tags (men / women / campaign), padded with the newest
 * ones. At most 3 small list calls plus the detail of the `limit` products actually shown, all in parallel.
 */
export async function getRelatedProducts(current: Product, limit: number): Promise<Product[]> {
  const want = limit + 1; // the current product may come back in its own lists
  const tags = current.tags.slice(0, 2);
  const lists = await Promise.all([
    ...tags.map((tag) => apiListProducts({ tag, limit: want }).catch(() => null)),
    apiListProducts({ limit: want }).catch(() => null),
  ]);
  const score = new Map<string, { summary: ApiProductSummary; score: number; order: number }>();
  let order = 0;
  lists.forEach((page, listIndex) => {
    const isTagList = listIndex < tags.length;
    for (const summary of page?.items ?? []) {
      if (summary.handle === current.handle) continue;
      const entry = score.get(summary.handle) ?? { summary, score: 0, order: order++ };
      if (isTagList) entry.score += 1;
      score.set(summary.handle, entry);
    }
  });
  const top = [...score.values()].sort((a, b) => b.score - a.score || a.order - b.order).slice(0, limit);
  return enrichSummaries(top.map((e) => e.summary));
}

/** First `limit` products that can still be bought (search "Más buscado"): list data only, nothing to enrich. */
export async function getPopularProducts(limit: number): Promise<Product[]> {
  try {
    const page = await apiListProducts({ limit: Math.min(100, Math.max(limit * 3, limit)) });
    return page.items
      .filter((p) => p.available)
      .slice(0, limit)
      .map(mapSummary);
  } catch {
    return [];
  }
}
