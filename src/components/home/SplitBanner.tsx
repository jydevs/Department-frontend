import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import { pad2 } from "@/lib/cms/reader";

export interface SplitTile {
  id: string;
  label: string;
  imageUrl?: string;
  imageAlt: string;
  href: string;
  ariaLabel?: string;
  /** products in the linked collection (null = not a collection / unknown) */
  count: number | null;
}

/** Legacy single-banner mode (a `split-banner` section without `tile` blocks): photo on one side, text on the other. */
export interface LegacyBanner {
  heading: string;
  text?: string;
  imageUrl?: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  ctaLabel?: string;
  ctaHref?: string;
}

export interface SplitBannerProps {
  id?: string;
  ariaLabel?: string;
  tiles: SplitTile[];
  legacy?: LegacyBanner;
  showCount: boolean;
  countLabel: string;
  numbered: boolean;
  backgroundColor?: string;
}

const COLUMNS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

/**
 * Collection entry tiles (50/50 for two): WOMEN → /collections/women, MEN → /collections/men.
 * Photos start slightly desaturated and bloom on hover; a square arrow fills in.
 * Stacks on mobile.
 */
export function SplitBanner({ id, ariaLabel, tiles, legacy, showCount, countLabel, numbered, backgroundColor }: SplitBannerProps) {
  if (tiles.length === 0 && legacy) {
    return (
      <section
        id={id}
        aria-label={ariaLabel ?? legacy.heading}
        className="grid md:grid-cols-2"
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <div className={clsx("relative aspect-[4/5] md:aspect-auto md:min-h-[80svh]", legacy.imagePosition === "right" && "md:order-2")}>
          <PlaceholderImage label={legacy.imageAlt} src={legacy.imageUrl} tone="dark" hideLabel fill sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
        <Reveal className="flex flex-col justify-center gap-6 px-gutter py-section">
          <h2 className="font-display text-display-xl text-dept-white">{legacy.heading}</h2>
          {legacy.text && <p className="max-w-xl text-lg leading-relaxed text-white/70">{legacy.text}</p>}
          {legacy.ctaLabel && legacy.ctaHref && (
            <div>
              <Button href={legacy.ctaHref} variant="outline" arrow>
                {legacy.ctaLabel}
              </Button>
            </div>
          )}
        </Reveal>
      </section>
    );
  }
  if (tiles.length === 0) return null;
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={clsx("grid gap-px", COLUMNS[Math.min(4, tiles.length)], !backgroundColor && "bg-white/10")}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {tiles.map((tile, i) => {
        const meta = [
          numbered ? `0${i + 1}` : null,
          showCount && tile.count !== null ? `${pad2(tile.count)} ${countLabel}` : null,
        ].filter((m): m is string => m !== null);
        return (
          <Reveal key={tile.id} delay={i * 120} className="h-full bg-dept-black">
            <Link
              href={tile.href}
              aria-label={tile.ariaLabel}
              className="group relative block aspect-[4/5] overflow-hidden md:aspect-auto md:h-[92svh]"
            >
              <PlaceholderImage
                label={tile.imageAlt}
                src={tile.imageUrl}
                tone="dark"
                hideLabel
                fill
                sizes={`(min-width: 768px) ${Math.round(100 / Math.min(4, tiles.length))}vw, 100vw`}
                imgClassName="saturate-[0.8] transition-[transform,filter] duration-[1600ms] ease-out-expo group-hover:scale-105 group-hover:saturate-100"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-[var(--gutter)]">
                <div>
                  {meta.length > 0 && (
                    <p className="font-condensed mb-3 text-[11px] tracking-[0.28em] text-dept-white/80">
                      {meta.join(" — ")}
                    </p>
                  )}
                  <span className="font-display block text-display-xl text-dept-white transition-transform duration-700 ease-out-expo group-hover:translate-x-2">
                    {tile.label}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center border border-white/40 text-dept-white transition-colors duration-500 ease-out-expo group-hover:border-dept-white group-hover:bg-dept-white group-hover:text-dept-black md:h-16 md:w-16"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M8 7h9v9" />
                  </svg>
                </span>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </section>
  );
}
