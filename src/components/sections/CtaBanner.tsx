import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

type ButtonVariant = "solid" | "outline" | "red";

export interface CtaBannerProps {
  id?: string;
  eyebrow?: string;
  heading?: string;
  text?: string;
  /** stacked = big headline with the button underneath; split = text left, buttons right */
  layout: "stacked" | "split";
  ctaLabel?: string;
  ctaHref?: string;
  ctaVariant: ButtonVariant;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaVariant: ButtonVariant;
  backgroundColor?: string;
}

/** Closing call to action: community page ("stacked") and the lower block of the 404 ("split"). */
export function CtaBanner(props: CtaBannerProps) {
  const {
    id,
    eyebrow,
    heading,
    text,
    layout,
    ctaLabel,
    ctaHref,
    ctaVariant,
    secondaryCtaLabel,
    secondaryCtaHref,
    secondaryCtaVariant,
    backgroundColor,
  } = props;
  const style = backgroundColor ? { backgroundColor } : undefined;

  if (layout === "split") {
    return (
      <section
        id={id}
        style={style}
        className="flex flex-col gap-8 px-gutter py-12 md:flex-row md:items-center md:justify-between md:py-16"
      >
        <div className="max-w-md">
          {eyebrow && (
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
              <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
              {eyebrow}
            </p>
          )}
          {heading && <h2 className="font-display mb-4 text-display-md text-dept-white">{heading}</h2>}
          {text && <p className="text-lg leading-snug text-white/70 md:text-xl">{text}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {ctaLabel && ctaHref && (
            <Button href={ctaHref} variant={ctaVariant} size="lg" arrow={ctaVariant === "solid"}>
              {ctaLabel}
            </Button>
          )}
          {secondaryCtaLabel && secondaryCtaHref && (
            <Button href={secondaryCtaHref} variant={secondaryCtaVariant} size="lg">
              {secondaryCtaLabel}
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id={id} style={style} className="px-gutter py-section">
      <Reveal>
        {eyebrow && (
          <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
            <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
            {eyebrow}
          </p>
        )}
        {heading && <h2 className="font-display text-display-xl max-w-5xl text-dept-white">{heading}</h2>}
        {text && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{text}</p>}
        {((ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref)) && (
          <div className="mt-10 flex flex-wrap gap-3 md:mt-14">
            {ctaLabel && ctaHref && (
              <Button href={ctaHref} variant={ctaVariant} size="lg" arrow>
                {ctaLabel}
              </Button>
            )}
            {secondaryCtaLabel && secondaryCtaHref && (
              <Button href={secondaryCtaHref} variant={secondaryCtaVariant} size="lg">
                {secondaryCtaLabel}
              </Button>
            )}
          </div>
        )}
      </Reveal>
    </section>
  );
}
