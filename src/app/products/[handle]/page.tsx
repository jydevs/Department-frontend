import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/cms/JsonLd";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getProduct as getApiProduct } from "@/lib/api/catalog";
import { getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import { mapProduct } from "@/lib/catalog/service";
import { absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  try {
    const api = await getApiProduct(handle);
    if (!api) return {};
    const product = mapProduct(api);
    const title = api.seo?.title || product.name;
    const description = api.seo?.description || product.description || undefined;
    return {
      title,
      description,
      alternates: { canonical: `/products/${product.handle}` },
      openGraph: { type: "website", title, description },
    };
  } catch {
    return {};
  }
}

/**
 * Product detail. The product (variants, availability, prices, gallery, metafields) comes from the API and the
 * layout from `template/product`. Desktop: photo column (60%) + sticky info panel (40%).
 * Mobile: swipeable gallery, then the info panel and a sticky add-to-cart bar.
 */
export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const [settings, template, api] = await Promise.all([
    getSiteSettingsOrDefault(),
    getTemplate("product"),
    getApiProduct(handle),
  ]);
  if (!api) notFound();
  if (!template) throw new Error("CONTENT_UNAVAILABLE: template/product");
  const product = mapProduct(api);

  // schema.org Product (rich results). Prices are COP, exactly as shown on the page.
  const url = absoluteUrl(`/products/${product.handle}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => (src.startsWith("/") ? absoluteUrl(src) : src)),
    brand: { "@type": "Brand", name: product.vendor ?? settings.brand.name },
    url,
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: product.price,
      availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
  };

  return (
    <article className="pt-[var(--chrome-h)]">
      <JsonLd data={jsonLd} />
      <SectionRenderer sections={template.sections} ctx={{ settings, product }} />
    </article>
  );
}
