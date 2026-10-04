import type { Metadata } from "next";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getTemplate } from "@/lib/cms/content";
import { fallbackHome } from "@/lib/cms/fallback";
import { getSite } from "@/lib/cms/site";
import { SITE_DESCRIPTION, SITE_URL, absoluteUrl } from "@/lib/site";
import { safeHref } from "@/lib/url";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * Home dirigida por el CMS (`template/home`): hero, marquesina, novedades, colecciones, campaña, manifiesto y valores.
 * Se edita en `/admin/content/templates/home`; publicar revalida la página (etiqueta `content:template:home`).
 */
export default async function HomePage() {
  const [home, site] = await Promise.all([getTemplate("home"), getSite()]);
  const brand = site.client.brandName;
  const description = site.settings?.seo?.defaultDescription ?? site.settings?.brand?.description ?? SITE_DESCRIPTION;
  const logo = site.settings?.brand?.logoMediaUrl;
  const sameAs = Object.values(site.settings?.social ?? {}).flatMap((u) => {
    const href = u && /^https:\/\//i.test(u) ? safeHref(u) : null;
    return href ? [href] : [];
  });

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: brand,
            url: SITE_URL,
            description,
            ...(logo ? { logo: /^https?:\/\//i.test(logo) ? logo : absoluteUrl(logo) } : {}),
            ...(sameAs.length ? { sameAs } : {}),
          },
          { "@context": "https://schema.org", "@type": "WebSite", name: brand, url: SITE_URL, inLanguage: "es-CO" },
        ]}
      />
      <SectionRenderer sections={home?.sections ?? fallbackHome(brand, site.client.tagline)} />
    </>
  );
}
