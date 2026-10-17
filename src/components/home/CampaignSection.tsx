import type { Product } from "@/lib/catalog/types";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { GridLabels } from "@/components/product/labels";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { pad2 } from "@/lib/cms/reader";

export interface CampaignSectionProps {
  id?: string;
  eyebrow?: string;
  heading: string;
  headingOutline?: string;
  text?: string;
  products: Product[];
  columns: 3 | 4;
  showCount: boolean;
  countLabel: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaVariant: "solid" | "outline" | "red";
  alignment: "left" | "center" | "right";
  labels: GridLabels;
}

/**
 * Campaign: indexed heading with an outlined second line, then the featured
 * pieces of a collection in a 3-up grid.
 */
export function CampaignSection({
  id,
  eyebrow,
  heading,
  headingOutline,
  text,
  products,
  columns,
  showCount,
  countLabel,
  ctaLabel,
  ctaHref,
  ctaVariant,
  alignment,
  labels,
}: CampaignSectionProps) {
  const titleId = `${id ?? "campaign"}-title`;
  const centered = alignment === "center";

  return (
    <section id={id} aria-labelledby={titleId} className="py-section">
      <div
        className={`mb-12 flex flex-wrap items-end gap-8 px-gutter md:mb-16 ${centered ? "justify-center text-center" : "justify-between"}`}
      >
        <Reveal>
          {eyebrow && (
            <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-gray-300">
              <span aria-hidden className="h-px w-10 bg-dept-red" />
              {eyebrow}
            </p>
          )}
          <h2 id={titleId} className="font-display text-display-xl text-dept-white">
            {heading}
            {headingOutline && (
              <>
                {" "}
                <span className="text-outline block">{headingOutline}</span>
              </>
            )}
          </h2>
          {text && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{text}</p>}
        </Reveal>

        {(showCount || (ctaLabel && ctaHref)) && (
          <Reveal delay={150} className="flex items-center gap-6">
            {showCount && (
              <p className="font-condensed hidden text-[11px] tracking-[0.24em] text-dept-gray-500 sm:block">
                {pad2(products.length)} {countLabel}
              </p>
            )}
            {ctaLabel && ctaHref && (
              <Button href={ctaHref} variant={ctaVariant} arrow>
                {ctaLabel}
              </Button>
            )}
          </Reveal>
        )}
      </div>

      <ProductGrid products={products} columns={columns} labels={labels} />
    </section>
  );
}
