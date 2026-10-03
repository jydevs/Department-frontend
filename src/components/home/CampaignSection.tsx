import { getProducts } from "@/lib/api/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { BrHeading, Eyebrow } from "@/lib/cms/text";
import { bool, num, oneOf, optStr, str, type Settings } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

/** Campaña (sección `campaign`): titular indexado con segunda línea en contorno y rejilla de piezas de una colección. */
export async function CampaignSection({ s }: { s: Settings }) {
  const featured = await getProducts({ collection: optStr(s, "collectionHandle"), limit: num(s, "limit", 6) });
  const cta = safeHref(optStr(s, "ctaHref"));
  const columns = str(s, "columns", "3") === "4" ? 4 : 3;
  const align = oneOf(s, "alignment", ["left", "center", "right"] as const, "left");

  return (
    <section aria-labelledby="campaign-title" className="py-section">
      <div className={`mb-12 flex flex-wrap items-end justify-between gap-8 px-gutter md:mb-16 ${align === "center" ? "text-center md:justify-center" : ""}`}>
        <Reveal>
          {optStr(s, "eyebrow") && <Eyebrow text={str(s, "eyebrow")} />}
          <h2 id="campaign-title" className="font-display text-display-xl text-dept-white">
            <BrHeading text={str(s, "heading")} />{" "}
            {optStr(s, "headingOutline") && <span className="text-outline block">{str(s, "headingOutline")}</span>}
          </h2>
          {optStr(s, "text") && <p className="mt-5 max-w-xl text-dept-white/70">{str(s, "text")}</p>}
        </Reveal>

        <Reveal delay={150} className="flex items-center gap-6">
          {bool(s, "showCount", true) && (
            <p className="font-condensed hidden text-[11px] tracking-[0.24em] text-dept-gray-500 sm:block">
              {String(featured.length).padStart(2, "0")} {str(s, "countLabel", "piezas")}
            </p>
          )}
          {cta && optStr(s, "ctaLabel") && (
            <Button href={cta} variant={oneOf(s, "ctaVariant", ["solid", "outline", "red"] as const, "outline")} arrow>
              {str(s, "ctaLabel")}
            </Button>
          )}
        </Reveal>
      </div>

      <ProductGrid products={featured} columns={columns} />
    </section>
  );
}
