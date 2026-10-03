import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getProduct, plainText } from "@/lib/api/catalog";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_PRODUCT } from "@/lib/cms/fallback";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ handle: string }> };

export const dynamicParams = true;
// Los productos se generan bajo demanda (ISR): el build no depende de la API ni la satura de peticiones.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle).catch(() => null);
  if (!product) return {};
  const description = plainText(product.description, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: { type: "website", title: product.name, description },
  };
}

/**
 * Ficha de producto: plantilla `product` del CMS (detalle + relacionados) con el producto real de la API.
 * Desktop: fotos (60%) + panel sticky (40%). Móvil: carrusel, panel y barra "añadir" fija.
 */
export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const [product, template] = await Promise.all([getProduct(handle), getTemplate("product")]);
  if (!product) notFound();

  // schema.org Product (rich results). Precios en COP, tal como se muestran.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainText(product.description, 300),
    image: product.images.map((src) => absoluteUrl(src)),
    brand: { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl(`/products/${product.handle}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: product.price,
      availability: product.badge === "agotado" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: absoluteUrl(`/products/${product.handle}`),
    },
  };

  return (
    <article className="pt-[var(--chrome-h)]">
      <script
        type="application/ld+json"
        // solo la salida de JSON.stringify; `<` escapado para que el contenido no pueda cerrar la etiqueta
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "<") }}
      />
      <SectionRenderer sections={template?.sections ?? FALLBACK_PRODUCT} ctx={{ product }} />
    </article>
  );
}
