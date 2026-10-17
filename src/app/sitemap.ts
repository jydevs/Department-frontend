import type { MetadataRoute } from "next";
import { listCollections, listProducts } from "@/lib/api/catalog";
import { listPages } from "@/lib/api/content";
import { absoluteUrl } from "@/lib/site";

// built from the API on request (cached per tag by the data layer), never at build time
export const dynamic = "force-dynamic";

const MAX_PAGES = 20;

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

/** Published products, collections and CMS pages. If the API is down the sitemap degrades to the home page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
  ];

  const [collections, pages, products] = await Promise.all([
    listCollections().catch(() => []),
    listPages().catch(() => []),
    allProductHandles().catch(() => []),
  ]);

  for (const c of collections) {
    entries.push({ url: absoluteUrl(`/collections/${c.handle}`), lastModified: now, changeFrequency: "monthly", priority: 0.7 });
  }
  for (const p of pages) {
    entries.push({ url: absoluteUrl(`/pages/${p.handle}`), lastModified: now, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const handle of products) {
    entries.push({ url: absoluteUrl(`/products/${handle}`), lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  }
  return entries;
}
