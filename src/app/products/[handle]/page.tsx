import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer, productDetailLabels } from "@/components/cms/SectionRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProduct, plainText } from "@/lib/api/catalog";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_PRODUCT } from "@/lib/cms/fallback";
import { getSite } from "@/lib/cms/site";
import { sectionOf } from "@/lib/cms/types";
import { breadcrumbLd } from "@/lib/jsonld";
import { absoluteMedia, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ handle: string }> };

export const dynamicParams = true;
// Los productos se generan bajo demanda (ISR): el build no depende de la API ni la satura de peticiones.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const [product, site] = await Promise.all([getProduct(handle), getSite()]);
  if (!product) return {};
  return pageMetadata({
    title: product.seoTitle || product.name,
    description: product.seoDescription || plainText(product.description, 160),
    path: `/products/${encodeURIComponent(product.handle)}`,
    image: product.images[0] ? { url: product.images[0], alt: product.imageLabel } : undefined,
    brand: site.client.brandName,
    titleTemplate: site.settings?.seo?.titleTemplate,
  });
}

/**
 * Ficha de producto: plantilla `product` del CMS (detalle + relacionados) con el producto real de la API.
 * Desktop: fotos (60%) + panel sticky (40%). Móvil: carrusel, panel y barra "añadir" fija.
 */
export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const [product, template, site] = await Promise.all([getProduct(handle), getTemplate("product"), getSite()]);
  if (!product) notFound();

  const sections = template?.sections ?? FALLBACK_PRODUCT;
  const labels = productDetailLabels(sectionOf(sections, "product-detail")?.settings);
  const url = absoluteUrl(`/products/${encodeURIComponent(product.handle)}`);

  // schema.org Product (rich results): una Offer por variante con su `sku` y disponibilidad. Precios en COP, tal como se muestran.
  const offer = (price: number, available: boolean, sku?: string, name?: string) => ({
    "@type": "Offer",
    ...(sku ? { sku } : {}),
    ...(name ? { name } : {}),
    priceCurrency: "COP",
    price,
    availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url,
  });
  const multi = product.variants.length > 1;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainText(product.description, 300),
    image: product.images.map(absoluteMedia),
    brand: { "@type": "Brand", name: site.client.brandName },
    url,
    ...(product.variants.find((v) => v.sku)?.sku ? { sku: product.variants.find((v) => v.sku)?.sku } : {}),
    offers: product.variants.length
      ? product.variants.map((v) => offer(v.price, v.available, v.sku, multi ? v.title : undefined))
      : offer(product.price, product.badge !== "agotado"),
  };

  return (
    <article className="pt-[var(--chrome-h)]">
      <JsonLd
        data={[
          jsonLd,
          breadcrumbLd([
            { name: labels.home, url: absoluteUrl("/") },
            { name: labels.collection, url: absoluteUrl(`/collections/${encodeURIComponent(labels.collectionHandle)}`) },
            { name: product.name, url },
          ]),
        ]}
      />
      <SectionRenderer sections={sections} ctx={{ product }} />
    </article>
  );
}
