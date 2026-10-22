import type { MetadataRoute } from "next";
import { getCollection, getProduct, listCollections, listProducts } from "@/lib/api/catalog";
import { getPage, listPages } from "@/lib/api/content";
import { absoluteUrl } from "@/lib/site";

// built from the API on request (cached per tag by the data layer), never at build time
export const dynamic = "force-dynamic";

const MAX_PAGES = 20;
/** Products whose real modification date is looked up (one cached detail call each); beyond this, no date is emitted. */
const MAX_PRODUCT_DATES = 500;
const BATCH = 25;

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Runs `fn` over `items` in parallel batches. */
async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    out.push(...(await Promise.all(items.slice(i, i + BATCH).map(fn))));
  }
  return out;
}

async function allProductHandles(): Promise<string[]> {
  const handles: string[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await listProducts({ limit: 100, cursor });
    handles.push(...page.items.map((p) => p.handle));
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return handles;
}

/**
 * Published products, collections and CMS pages, each with the REAL last-modified date from the API
 * (`updatedAt` of products / collections, `publishedAt` of pages). When a date is unknown it is omitted rather than
 * invented. If the API is down the sitemap degrades to the home page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 }];

  const [collections, pages, products] = await Promise.all([
    listCollections()
      .then((list) =>
        inBatches(list, async (c) => ({
          handle: c.handle,
          modified: toDate((await getCollection(c.handle, { limit: 1 }).catch(() => null))?.collection.updatedAt),
        })),
      )
      .catch(() => []),
    listPages()
      .then((list) =>
        inBatches(list, async (p) => ({
          handle: p.handle,
          modified: toDate((await getPage(p.handle).catch(() => null))?.publishedAt),
        })),
      )
      .catch(() => []),
    allProductHandles().catch(() => [] as string[]),
  ]);

  // dates of the first products (cached details); the rest are listed without a date
  const dated = await inBatches(products.slice(0, MAX_PRODUCT_DATES), async (handle) => ({
    handle,
    modified: toDate((await getProduct(handle).catch(() => null))?.updatedAt),
  }));
  const productEntries = [
    ...dated,
    ...products.slice(MAX_PRODUCT_DATES).map((handle) => ({ handle, modified: undefined as Date | undefined })),
  ];

  for (const c of collections) {
    entries.push({ url: absoluteUrl(`/collections/${c.handle}`), lastModified: c.modified, changeFrequency: "monthly", priority: 0.7 });
  }
  for (const p of pages) {
    entries.push({ url: absoluteUrl(`/pages/${p.handle}`), lastModified: p.modified, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const p of productEntries) {
    entries.push({ url: absoluteUrl(`/products/${p.handle}`), lastModified: p.modified, changeFrequency: "weekly", priority: 0.8 });
  }
  return entries;
}
