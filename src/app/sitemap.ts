import type { MetadataRoute } from "next";
import { listCollectionHandles, listProductHandles } from "@/lib/api/catalog";
import { getPageList } from "@/lib/cms/content";
import { absoluteUrl } from "@/lib/site";

/** Se regenera cada hora; si la regeneración falla Next sigue sirviendo el último sitemap bueno. */
export const revalidate = 3600;

const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

type Entry = MetadataRoute.Sitemap[number];
const entry = (path: string, priority: number, changeFrequency: "weekly" | "monthly"): Entry => ({ url: absoluteUrl(path), changeFrequency, priority });

/**
 * El sitemap sale de la API: TODOS los productos (paginados con el cursor), colecciones y páginas del CMS.
 * La API no entrega fechas de modificación en los listados, así que no se inventa `lastModified`.
 * Si la API falla en el build solo se publican las rutas estáticas; en runtime el error se propaga (ISR conserva el último bueno).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = entry("/", 1, "weekly");
  try {
    const [products, collections, pages] = await Promise.all([listProductHandles(), listCollectionHandles(), getPageList({ bail: false })]);
    return [
      home,
      ...collections.map((h) => entry(`/collections/${encodeURIComponent(h)}`, 0.7, "monthly")),
      ...pages.map((p) => entry(`/pages/${encodeURIComponent(p.handle)}`, 0.5, "monthly")),
      ...products.map((h) => entry(`/products/${encodeURIComponent(h)}`, 0.8, "weekly")),
    ];
  } catch (e) {
    if (IS_BUILD) return [home];
    throw e;
  }
}
