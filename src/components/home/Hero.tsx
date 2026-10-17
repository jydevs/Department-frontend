import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";

export interface HeroProps {
  id?: string;
  eyebrow?: string;
  /** headline; `\n` starts a new animated line */
  lines: string[];
  /** appended after the last line in the accent colour (e.g. the red dot) */
  headingAccent?: string;
  subheading?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  imageAlt: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  /** 0–1: strength of the legibility gradient */
  overlayOpacity: number;
  /** #RRGGBB */
  overlayColor: string;
  alignment: "left" | "center" | "right";
  height: "medium" | "large" | "full";
  kenBurns: boolean;
  scrollLabel?: string;
  scrollTargetId?: string;
}

const HEIGHT: Record<HeroProps["height"], string> = {
  medium: "min-h-[60svh]",
  large: "min-h-[85svh]",
  full: "min-h-[100svh]",
};

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`;
}

/**
 * Full-bleed hero. Slow push-in on the photograph, headline revealed line by
 * line, two CTAs and a scroll cue. The fixed header overlays the top edge.
 */
export function Hero(props: HeroProps) {
  const {
    id,
    eyebrow,
    lines,
    headingAccent,
    subheading,
    imageUrl,
    mobileImageUrl,
    imageAlt,
    ctaLabel,
    ctaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
    overlayOpacity,
    overlayColor,
    alignment,
    height,
    kenBurns,
    scrollLabel,
    scrollTargetId,
  } = props;

  const op = overlayOpacity;
  const bottom = `linear-gradient(to top, ${rgba(overlayColor, op)}, ${rgba(overlayColor, op * 0.235)}, ${rgba(overlayColor, op * 0.118)})`;
  const side = `linear-gradient(to right, ${rgba(overlayColor, op * 0.53)}, ${rgba(overlayColor, 0)}, ${rgba(overlayColor, 0)})`;
  const centered = alignment === "center";
  const right = alignment === "right";

  return (
    <section id={id} className={clsx("relative isolate w-full overflow-hidden", HEIGHT[height])}>
      {/* photograph (slow push-in) */}
      <div className={clsx("absolute inset-0 will-change-transform", kenBurns && "animate-[kenburns_32s_ease-out_both]")}>
        {imageUrl && mobileImageUrl ? (
          <>
            <div className="absolute inset-0 md:hidden">
              <PlaceholderImage label={imageAlt} src={mobileImageUrl} tone="cold" hideLabel fill priority />
            </div>
            <div className="absolute inset-0 hidden md:block">
              <PlaceholderImage label={imageAlt} src={imageUrl} tone="cold" hideLabel fill priority />
            </div>
          </>
        ) : (
          <PlaceholderImage label={imageAlt} src={imageUrl ?? mobileImageUrl} tone="cold" hideLabel fill priority />
        )}
      </div>

      {/* legibility: bottom + left falloff */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: bottom }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: side }} />

      <div
        className={clsx(
          "relative z-10 flex flex-col justify-end px-gutter pb-10 pt-[calc(var(--chrome-h)+2rem)] md:pb-14",
          HEIGHT[height],
          centered && "items-center text-center",
          right && "items-end text-right",
        )}
      >
        {eyebrow && (
          <p
            className="font-condensed mb-5 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80"
            style={{ animation: "fade-up 1s var(--ease-out-expo) 0.2s both" }}
          >
            <span aria-hidden className="h-px w-10 bg-dept-red" />
            {eyebrow}
          </p>
        )}

        {lines.length > 0 && (
          <h1 className="font-display text-display-2xl text-dept-white">
            {lines.map((line, i) => (
              <span key={i} className="mask-line">
                <span className="mask-line-inner" style={{ ["--d" as string]: `${i * 70}ms` }}>
                  {line}
                  {i === lines.length - 1 && headingAccent ? <span className="text-dept-red">{headingAccent}</span> : null}
                  {i < lines.length - 1 ? " " : null}
                </span>
              </span>
            ))}
          </h1>
        )}

        {subheading && (
          <p
            className="mt-6 max-w-xl text-lg leading-snug text-dept-white/80 md:text-xl"
            style={{ animation: "fade-up 1s var(--ease-out-expo) 0.5s both" }}
          >
            {subheading}
          </p>
        )}

        <div
          className={clsx(
            "mt-8 flex flex-wrap items-end gap-6 md:mt-10",
            centered ? "justify-center" : "justify-between",
            right && "flex-row-reverse",
          )}
        >
          {((ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref)) && (
            <div className="flex flex-wrap gap-3" style={{ animation: "fade-up 1s var(--ease-out-expo) 0.7s both" }}>
              {ctaLabel && ctaHref && (
                <Button href={ctaHref} size="lg" arrow>
                  {ctaLabel}
                </Button>
              )}
              {secondaryCtaLabel && secondaryCtaHref && (
                <Button href={secondaryCtaHref} variant="outline" size="lg">
                  {secondaryCtaLabel}
                </Button>
              )}
            </div>
          )}

          {scrollLabel && scrollTargetId && (
            <a
              href={`#${scrollTargetId}`}
              className="group hidden items-center gap-4 font-condensed text-[11px] tracking-[0.28em] text-dept-white/70 transition-colors hover:text-dept-white md:flex"
              style={{ animation: "fade-up 1s var(--ease-out-expo) 0.9s both" }}
            >
              {scrollLabel}
              <span aria-hidden className="relative block h-12 w-px overflow-hidden bg-white/25">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_var(--ease-in-out-quart)_infinite] bg-dept-white" />
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
