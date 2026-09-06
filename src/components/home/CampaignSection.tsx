import { getCampaignProducts } from "@/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";

/**
 * Campaign section: "RAGS TO RICHES – EXTENDED VERSION" showcase.
 * Displays featured products in a 3-column layout.
 * Server component.
 */
export function CampaignSection() {
  return (
    <section className="bg-dept-black py-12 md:py-16">
      <h2 className="font-display text-dept-white text-center text-2xl sm:text-4xl lg:text-5xl px-6 max-w-4xl mx-auto">
        Rags to Riches – Extended Version
      </h2>
      <div className="mt-8 md:mt-12">
        <ProductGrid products={getCampaignProducts()} columns={3} />
      </div>
    </section>
  );
}
