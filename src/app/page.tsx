import type { Metadata } from "next";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { JsonLd } from "@/components/cms/JsonLd";
import { getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { seo, brand } = await getSiteSettingsOrDefault();
  return {
    // the home page uses the full default title (the template does not apply to it)
    title: { absolute: seo.defaultTitle || brand.name },
    description: seo.defaultDescription,
    alternates: { canonical: "/" },
  };
}

/**
 * Home. Rendered entirely from `template/home` (hero → ticker → new arrivals → collections →
 * campaign grid → manifesto → values); the header, newsletter and footer come from the root layout.
 */
export default async function HomePage() {
  const [settings, template] = await Promise.all([getSiteSettingsOrDefault(), getTemplate("home")]);
  // a missing document is an error state too: error.tsx shows the branded message instead of a blank page
  if (!template) throw new Error("CONTENT_UNAVAILABLE: template/home");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.brand.name,
          url: absoluteUrl("/"),
          description: settings.brand.description ?? settings.seo.defaultDescription,
          sameAs: Object.values(settings.social).filter((u): u is string => typeof u === "string"),
        }}
      />
      <SectionRenderer sections={template.sections} ctx={{ settings }} />
    </>
  );
}
