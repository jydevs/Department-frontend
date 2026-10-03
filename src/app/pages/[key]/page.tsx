import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getPage, getPageList } from "@/lib/cms/content";

type PageProps = { params: Promise<{ key: string }> };

export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    return (await getPageList()).map((p) => ({ key: p.handle }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const page = await getPage(key).catch(() => null);
  if (!page) return {};
  return { title: page.seoTitle || page.title, description: page.seoDescription, alternates: { canonical: `/pages/${key}` } };
}

/** Páginas del CMS (`/pages/community`, `/pages/contact`, …): lista de secciones editable en `/admin/content/pages`. */
export default async function CmsPage({ params }: PageProps) {
  const { key } = await params;
  const page = await getPage(key);
  if (!page) notFound();
  return <SectionRenderer sections={page.sections ?? []} />;
}
