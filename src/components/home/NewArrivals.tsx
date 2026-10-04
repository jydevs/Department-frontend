import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { getCollectionCount } from "@/lib/api/catalog";
import { BrHeading } from "@/lib/cms/text";
import { bool, num, optStr, str, type Settings } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

/**
 * "New arrivals" (sección `new-arrivals`): full-bleed photo with scroll-driven parallax, giant outlined type
 * and a single CTA. El número de piezas sale de la colección elegida en el CMS.
 */
export async function NewArrivals({ s }: { s: Settings }) {
  const handle = optStr(s, "collectionHandle");
  const count = bool(s, "showCount", true) && handle ? await getCollectionCount(handle) : null;
  const cta = safeHref(optStr(s, "ctaHref"));
  const op = num(s, "overlayOpacity", 0.9);
  const color = /^#[0-9a-fA-F]{6}$/.test(str(s, "overlayColor")) ? str(s, "overlayColor") : "#000000";
  const mix = (p: number) => `color-mix(in srgb, ${color} ${Math.round(p * 100)}%, transparent)`;
  const eyebrow = [optStr(s, "eyebrow"), count !== null ? `${String(count).padStart(2, "0")} ${str(s, "countLabel", "piezas")}` : null].filter(Boolean).join(" · ");

  return (
    <section id={optStr(s, "anchorId") ?? "new-arrivals"} className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={`${bool(s, "parallax", true) ? "parallax-y absolute -inset-y-[12%]" : "absolute inset-y-0"} inset-x-0`}>
          <PlaceholderImage label={str(s, "imageAlt", str(s, "heading"))} src={optStr(s, "imageUrl")} tone="cold" hideLabel fill />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: `linear-gradient(to top, ${mix(op)}, ${mix(op * 0.44)}, ${mix(op * 0.33)})` }} />

      <div className="grid w-full items-end gap-10 px-gutter py-section md:grid-cols-[1fr_auto]">
        <div>
          {eyebrow && (
            <Reveal>
              <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
                <span aria-hidden className="h-px w-10 bg-dept-red" />
                {eyebrow}
              </p>
            </Reveal>
          )}
          <Reveal delay={100}>
            <h2 className="font-display text-display-2xl text-dept-white">
              <BrHeading text={str(s, "heading")} />{" "}
              {optStr(s, "headingOutline") && <span className="text-outline block">{str(s, "headingOutline")}</span>}
            </h2>
          </Reveal>
        </div>

        <Reveal delay={220} className="max-w-sm">
          {optStr(s, "subheading") && <p className="font-condensed text-lg leading-snug tracking-[0.1em] text-dept-white md:text-xl">{str(s, "subheading")}</p>}
          {cta && optStr(s, "ctaLabel") && (
            <Button href={cta} variant="solid" size="lg" arrow className="mt-8">
              {str(s, "ctaLabel")}
            </Button>
          )}
        </Reveal>
      </div>
    </section>
  );
}
