import { getCampaignProducts } from "@/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Campaign: "Rags to Riches – Extended Version" — indexed heading with an
 * outlined second line, then the featured pieces in a 3-up grid.
 */
export function CampaignSection() {
  const featured = getCampaignProducts();

  return (
    <section aria-labelledby="campaign-title" className="py-section">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-8 px-gutter md:mb-16">
        <Reveal>
          <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-gray-300">
            <span aria-hidden className="h-px w-10 bg-dept-red" />
            02 — Campaña
          </p>
          <h2 id="campaign-title" className="font-display text-display-xl text-dept-white">
            Rags to Riches
            <span className="text-outline block">Extended Version</span>
          </h2>
        </Reveal>

        <Reveal delay={150} className="flex items-center gap-6">
          <p className="font-condensed hidden text-[11px] tracking-[0.24em] text-dept-gray-500 sm:block">
            {String(featured.length).padStart(2, "0")} piezas
          </p>
          <Button href="/collections/all" variant="outline" arrow>
            Ver todo
          </Button>
        </Reveal>
      </div>

      <ProductGrid products={featured} columns={3} />
    </section>
  );
}
