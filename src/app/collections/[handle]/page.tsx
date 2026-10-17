import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import { getCollection } from "@/lib/api/catalog";
import { getCollectionView } from "@/lib/catalog/service";
import { htmlToText } from "@/lib/catalog/html";
import { resolveMediaUrl } from "@/lib/api/media";

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  try {
    const data = await getCollection(handle, { limit: 1 });
    if (!data) return {};
    const { collection } = data;
    const description = collection.seo?.description || htmlToText(collection.descriptionHtml) || undefined;
    const image = resolveMediaUrl(collection.image?.url);
    return {
      title: collection.seo?.title || collection.title,
      description,
      alternates: { canonical: `/collections/${collection.handle}` },
      openGraph: { type: "website", title: collection.seo?.title || collection.title, description, ...(image ? { images: [{ url: image }] } : null) },
    };
  } catch {
    return {};
  }
}

/**
 * Collection / catalogue page. The collection (title, cover, products) comes from the API and the layout of the
 * page — hero, tabs, filter bar and grid — from `template/collection`.
 */
export default async function CollectionPage({ params }: PageProps) {
  const { handle } = await params;
  const [settings, template, collection] = await Promise.all([
    getSiteSettingsOrDefault(),
    getTemplate("collection"),
    getCollectionView(handle),
  ]);
  if (!collection) notFound();
  if (!template) throw new Error("CONTENT_UNAVAILABLE: template/collection");

  return (
    <div>
      <SectionRenderer sections={template.sections} ctx={{ settings, collection }} />
    </div>
  );
}
