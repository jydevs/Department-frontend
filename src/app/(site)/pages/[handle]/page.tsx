import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getPage, getSiteSettingsOrDefault } from "@/lib/api/content";
import { isHandle } from "@/lib/handle";

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (!isHandle(handle)) return {};
  try {
    const page = await getPage(handle);
    if (!page) return {};
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
      alternates: { canonical: `/pages/${page.handle}` },
    };
  } catch {
    return {};
  }
}

/**
 * CMS pages (`page/<handle>`): /pages/community, /pages/contact and any page an admin creates.
 * The sections of the page are rendered in order by the section registry.
 */
export default async function CmsPage({ params }: PageProps) {
  const { handle } = await params;
  if (!isHandle(handle)) notFound();
  const [settings, page] = await Promise.all([getSiteSettingsOrDefault(), getPage(handle)]);
  if (!page) notFound();

  return <SectionRenderer sections={page.sections} ctx={{ settings }} />;
}
