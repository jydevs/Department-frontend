import type { CSSProperties } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { pad2 } from "@/lib/cms/reader";

export interface NewArrivalsProps {
  id?: string;
  eyebrow?: string;
  heading: string;
  headingOutline?: string;
  subheading?: string;
  imageUrl?: string;
  imageAlt: string;
  overlayColor: string;
  overlayOpacity: number;
  parallax: boolean;
  /** products in the linked collection (null = unknown / not requested) */
  count: number | null;
  showCount: boolean;
  countLabel: string;
  ctaLabel?: string;
  ctaHref?: string;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`;
}

/**
 * "New arrivals": a full-bleed night shot with a scroll-driven parallax, giant
 * outlined type and a single CTA. (Was a video slot in the reference — swap the
 * photo for a <video autoPlay muted loop playsInline> once the clip exists.)
 */
export function NewArrivals({
  id,
  eyebrow,
  heading,
  headingOutline,
  subheading,
  imageUrl,
  imageAlt,
  overlayColor,
  overlayOpacity,
  parallax,
  count,
  showCount,
  countLabel,
  ctaLabel,
  ctaHref,
}: NewArrivalsProps) {
  const scrim: CSSProperties = {
    backgroundImage: `linear-gradient(to top, ${rgba(overlayColor, overlayOpacity)}, ${rgba(overlayColor, overlayOpacity * 0.444)}, ${rgba(overlayColor, overlayOpacity * 0.333)})`,
  };
  const eyebrowText =
    eyebrow === undefined
      ? undefined
      : showCount && count !== null && count > 0
        ? `${eyebrow} · ${pad2(count)} ${countLabel}`
        : eyebrow;

  return (
    <section id={id} className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={parallax ? "parallax-y absolute -inset-y-[12%] inset-x-0" : "absolute inset-0"}>
          <PlaceholderImage label={imageAlt} src={imageUrl} tone="cold" hideLabel fill />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={scrim} />

      <div className="grid w-full items-end gap-10 px-gutter py-section md:grid-cols-[1fr_auto]">
        <div>
          {eyebrowText && (
            <Reveal>
              <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
                <span aria-hidden className="h-px w-10 bg-dept-red" />
                {eyebrowText}
              </p>
            </Reveal>
          )}
          <Reveal delay={100}>
            <h2 className="font-display text-display-2xl text-dept-white">
              {heading}
              {headingOutline && (
                <>
                  {" "}
                  <span className="text-outline block">{headingOutline}</span>
                </>
              )}
            </h2>
          </Reveal>
        </div>

        {(subheading || (ctaLabel && ctaHref)) && (
          <Reveal delay={220} className="max-w-sm">
            {subheading && (
              <p className="font-condensed text-lg leading-snug tracking-[0.1em] text-dept-white md:text-xl">{subheading}</p>
            )}
            {ctaLabel && ctaHref && (
              <Button href={ctaHref} variant="solid" size="lg" arrow className="mt-8">
                {ctaLabel}
              </Button>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
