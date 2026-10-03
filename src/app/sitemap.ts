import type { MetadataRoute } from "next";
import { getCollections, listProductHandles } from "@/lib/api/catalog";
import { getPageList } from "@/lib/cms/content";
import { absoluteUrl } from "@/lib/site";

/** El sitemap sale de la API (productos, colecciones y páginas del CMS); si la API no responde, queda solo la home. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [products, collections, pages] = await Promise.all([
    listProductHandles().catch(() => []),
    getCollections().catch(() => []),
    getPageList().catch(() => []),
  ]);
  const entry = (path: string, priority: number, changeFrequency: "weekly" | "monthly") => ({ url: absoluteUrl(path), lastModified: now, changeFrequency, priority });
  return [
    entry("/", 1, "weekly"),
    ...collections.map((c) => entry(`/collections/${c.handle}`, 0.7, "monthly")),
    ...pages.map((p) => entry(`/pages/${p.handle}`, 0.5, "monthly")),
    ...products.map((h) => entry(`/products/${h}`, 0.8, "weekly")),
  ];
}
