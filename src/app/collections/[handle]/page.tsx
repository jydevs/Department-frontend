import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getCollection, listCollectionHandles } from "@/lib/api/catalog";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_COLLECTION } from "@/lib/cms/fallback";

type PageProps = { params: Promise<{ handle: string }> };

/** Las colecciones se generan bajo demanda y se renuevan por tiempo (el catálogo no emite webhooks). */
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await listCollectionHandles()).map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await getCollection(handle).catch(() => null);
  if (!data) return {};
  return { title: data.collection.title === "Clothes" ? `${data.collection.title} — ${handle}` : data.collection.title, description: data.collection.description, alternates: { canonical: `/collections/${handle}` } };
}

/** Colección: plantilla `collection` del CMS (cabecera con pestañas + rejilla con filtros) con los productos reales. */
export default async function CollectionPage({ params }: PageProps) {
  const { handle } = await params;
  const [data, template] = await Promise.all([getCollection(handle), getTemplate("collection")]);
  if (!data) notFound();
  return <SectionRenderer sections={template?.sections ?? FALLBACK_COLLECTION} ctx={{ collection: data }} />;
}
