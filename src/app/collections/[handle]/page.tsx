import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollection, getCollectionInfo, getCollections, listCollectionHandles } from "@/lib/api/catalog";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_COLLECTION } from "@/lib/cms/fallback";
import { getSite } from "@/lib/cms/site";
import { breadcrumbLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ handle: string }> };

/** Las colecciones se generan bajo demanda y se renuevan por tiempo (el catálogo no emite webhooks). */
export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    return (await listCollectionHandles()).map((handle) => ({ handle }));
  } catch {
    return []; // API caída en el build: las colecciones se generan cuando alguien las visita
  }
}

/** "all" → "All", "new-in" → "New in" (solo para distinguir títulos repetidos). */
const readable = (handle: string) => {
  const t = handle.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const [collection, site] = await Promise.all([getCollectionInfo(handle), getSite()]);
  if (!collection) return {};
  // título propio: `seo.title` del catálogo; si no hay y otra colección se llama igual, se distingue con el handle
  let title = collection.seoTitle || collection.title;
  if (!collection.seoTitle && (await getCollections()).some((c) => c.handle !== handle && c.title.toLowerCase() === collection.title.toLowerCase())) title = `${collection.title} — ${readable(handle)}`;
  return pageMetadata({
    title,
    description: collection.seoDescription || collection.description,
    path: `/collections/${encodeURIComponent(handle)}`,
    image: collection.heroImage ? { url: collection.heroImage, alt: collection.heroImageLabel } : undefined,
    brand: site.client.brandName,
    titleTemplate: site.settings?.seo?.titleTemplate,
  });
}

/** Colección: plantilla `collection` del CMS (cabecera con pestañas + rejilla con filtros) con los productos reales. */
export default async function CollectionPage({ params }: PageProps) {
  const { handle } = await params;
  const [data, template] = await Promise.all([getCollection(handle), getTemplate("collection")]);
  if (!data) notFound();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Inicio", url: absoluteUrl("/") }, { name: data.collection.seoTitle || data.collection.title, url: absoluteUrl(`/collections/${encodeURIComponent(handle)}`) }])} />
      <SectionRenderer sections={template?.sections ?? FALLBACK_COLLECTION} ctx={{ collection: data }} />
    </>
  );
}
