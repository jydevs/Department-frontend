import { getCampaignProducts } from "@/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";

/**
 * SCAFFOLD STUB — flesh out in `feature/campaign-section`.
 * Big "RAGS TO RICHES – EXTENDED VERSION" title, then the product grid.
 */
export function CampaignSection() {
  return (
    <section className="bg-dept-black py-16">
      <h2 className="font-display px-6 text-center text-3xl text-dept-white sm:text-5xl">
        Rags to Riches – Extended Version
      </h2>
      <div className="mt-10">
        <ProductGrid products={getCampaignProducts()} />
      </div>
    </section>
  );
}
