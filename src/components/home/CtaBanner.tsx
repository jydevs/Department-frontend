import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/lib/cms/text";
import { oneOf, optStr, str, type Settings } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

const VARIANTS = ["solid", "outline", "red"] as const;

/** Banner con llamada a la acción (sección `cta-banner`): apilado o dividido (texto + botones). */
export function CtaBanner({ s }: { s: Settings }) {
  const cta = safeHref(optStr(s, "ctaHref")), cta2 = safeHref(optStr(s, "secondaryCtaHref"));
  const split = oneOf(s, "layout", ["stacked", "split"] as const, "stacked") === "split";
  const buttons = (
    <div className="flex flex-wrap gap-3">
      {cta && optStr(s, "ctaLabel") && (
        <Button href={cta} variant={oneOf(s, "ctaVariant", VARIANTS, "red")} size="lg" arrow>
          {str(s, "ctaLabel")}
        </Button>
      )}
      {cta2 && optStr(s, "secondaryCtaLabel") && (
        <Button href={cta2} variant={oneOf(s, "secondaryCtaVariant", VARIANTS, "outline")} size="lg">
          {str(s, "secondaryCtaLabel")}
        </Button>
      )}
    </div>
  );

  return (
    <section className={split ? "flex flex-col gap-8 px-gutter py-12 md:flex-row md:items-center md:justify-between md:py-16" : "px-gutter py-section"} style={{ background: optStr(s, "backgroundColor") }}>
      <Reveal>
        {optStr(s, "eyebrow") && <Eyebrow text={str(s, "eyebrow")} />}
        {optStr(s, "heading") && <h2 className="font-display text-display-xl max-w-5xl text-dept-white">{str(s, "heading")}</h2>}
        {optStr(s, "text") && <p className={split ? "max-w-md text-lg leading-snug text-white/70 md:text-xl" : "mt-6 max-w-xl text-white/70"}>{str(s, "text")}</p>}
        {!split && <div className="mt-10 md:mt-14">{buttons}</div>}
      </Reveal>
      {split && buttons}
    </section>
  );
}
