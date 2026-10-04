import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getPage, getPageList } from "@/lib/cms/content";
import { getSite } from "@/lib/cms/site";
import { pageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ key: string }> };

export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    return (await getPageList({ bail: false })).map((p) => ({ key: p.handle }));
  } catch {
    return []; // API caída en el build: las páginas se generan cuando alguien las visita
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params;
  const [page, site] = await Promise.all([getPage(key), getSite()]);
  if (!page) return {};
  return pageMetadata({
    title: page.seoTitle || page.title || key,
    description: page.seoDescription,
    path: `/pages/${encodeURIComponent(key)}`,
    brand: site.client.brandName,
    titleTemplate: site.settings?.seo?.titleTemplate,
  });
}

/** Secciones que ya dejan hueco para el header fijo (cabeceras a sangre o con padding superior propio). */
const OWN_TOP_SPACE = new Set(["hero", "page-header", "error-hero", "collection-hero", "new-arrivals", "contact-form"]);

/** Páginas del CMS (`/pages/community`, `/pages/contact`, …): lista de secciones editable en `/admin/content/pages`. */
export default async function CmsPage({ params }: PageProps) {
  const { key } = await params;
  const page = await getPage(key);
  if (!page) notFound();
  const sections = page.sections ?? [];
  const first = sections.find((s) => s.enabled);
  return (
    <div className={first && !OWN_TOP_SPACE.has(first.type) ? "pt-[var(--chrome-h)]" : undefined}>
      <SectionRenderer sections={sections} pageTitle={page.title || key} />
    </div>
  );
}
