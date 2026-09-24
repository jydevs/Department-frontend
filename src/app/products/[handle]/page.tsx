import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts, products } from "@/data/products";
import { Reveal } from "@/components/ui/Reveal";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductInfo } from "@/components/product/ProductInfo";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ handle: string }> };

export function generateStaticParams() {
  return products.map(({ handle }) => ({ handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = getProduct(handle);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: { type: "website", title: product.name, description: product.description },
  };
}

/**
 * Product detail. Desktop: photo column (60%) + sticky info panel (40%).
 * Mobile: swipeable gallery, then the info panel and a sticky add-to-cart bar.
 */
export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const product = getProduct(handle);
  if (!product) notFound();

  const related = getRelatedProducts(handle, 4);

  // schema.org Product (rich results). Prices are COP, exactly as shown on the page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => absoluteUrl(src)),
    brand: { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl(`/products/${product.handle}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: product.price,
      availability:
        product.badge === "agotado" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: absoluteUrl(`/products/${product.handle}`),
    },
  };

  return (
    <article className="pt-[var(--chrome-h)]">
      <script
        type="application/ld+json"
        // JSON.stringify output only; `<` escaped so the payload cannot close the tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
      />
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
        <ProductGallery images={product.images} name={product.name} imageLabel={product.imageLabel} />
        <ProductInfo product={product} />
      </div>

      <section aria-labelledby="related-title" className="border-t border-white/10 py-section">
        <Reveal>
          <div className="px-gutter mb-10 md:mb-14">
            <p className="text-[11px] tracking-[0.2em] text-dept-gray-500 uppercase">
              01 — Selección
            </p>
            <h2 id="related-title" className="font-display text-display-lg mt-4">
              Te puede interesar
            </h2>
          </div>
          <ProductGrid products={related} />
        </Reveal>
      </section>
    </article>
  );
}
