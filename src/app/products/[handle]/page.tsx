import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts, products } from "@/data/products";
import { Reveal } from "@/components/ui/Reveal";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductInfo } from "@/components/product/ProductInfo";

type PageProps = { params: Promise<{ handle: string }> };

export function generateStaticParams() {
  return products.map(({ handle }) => ({ handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = getProduct(handle);
  if (!product) return {};
  return { title: product.name, description: product.description };
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

  return (
    <article className="pt-[var(--chrome-h)]">
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
