import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { BrHeading, Eyebrow, Paragraphs } from "@/lib/cms/text";
import { oneOf, optStr, str, type Settings } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

/**
 * Manifiesto (sección `editorial`): foto a un lado y el texto de la campaña al otro — el entradilla (`lede`)
 * grande y el cuerpo (Markdown simple: párrafos) en texto corrido.
 */
export function EditorialBlock({ s }: { s: Settings }) {
  const layout = oneOf(s, "layout", ["text-only", "image-left", "image-right"] as const, "image-right");
  const img = optStr(s, "imageUrl");
  const hasImage = layout !== "text-only" && !!img;
  const cta = safeHref(optStr(s, "ctaHref"));
  const left = layout === "image-left";

  return (
    <section aria-labelledby="editorial-title" className="border-t border-white/10 py-section">
      <div className={`grid items-center gap-12 px-gutter md:gap-8 ${hasImage ? "md:grid-cols-12" : ""}`}>
        {hasImage && (
          <Reveal className={left ? "md:col-span-5" : "md:order-2 md:col-span-5 md:col-start-8"}>
            <div className="relative">
              <PlaceholderImage label={str(s, "imageAlt", str(s, "heading"))} src={img} ratio="4 / 5" tone="dark" hideLabel sizes="(min-width: 768px) 42vw, 100vw" />
              {optStr(s, "imageBadge") && (
                <span aria-hidden className="font-condensed absolute -bottom-3 -right-3 hidden bg-dept-red px-4 py-2 text-[11px] tracking-[0.24em] text-dept-white md:block">
                  {str(s, "imageBadge")}
                </span>
              )}
            </div>
          </Reveal>
        )}

        <div className={hasImage ? (left ? "md:col-span-6 md:col-start-7" : "md:order-1 md:col-span-6 md:col-start-1") : "mx-auto max-w-3xl"}>
          <Reveal>
            {optStr(s, "eyebrow") && <Eyebrow text={str(s, "eyebrow")} />}
            <h2 id="editorial-title" className="font-display text-display-lg text-dept-white">
              <BrHeading text={str(s, "heading")} />
            </h2>
          </Reveal>

          {optStr(s, "lede") && (
            <Reveal delay={120}>
              <p className="mt-10 text-xl font-medium leading-snug text-dept-white md:text-2xl">{str(s, "lede")}</p>
            </Reveal>
          )}

          <Reveal delay={200}>
            <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-relaxed text-dept-white/70 md:text-base">
              <Paragraphs text={str(s, "body")} />
            </div>
          </Reveal>

          {cta && optStr(s, "ctaLabel") && (
            <Reveal delay={420}>
              <Button href={cta} variant={oneOf(s, "ctaVariant", ["solid", "outline", "red"] as const, "red")} size="lg" arrow className="mt-12">
                {str(s, "ctaLabel")}
              </Button>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
