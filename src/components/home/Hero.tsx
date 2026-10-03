import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { MaskHeading } from "@/lib/cms/text";
import { bool, num, oneOf, optStr, str, type Settings } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

const HEIGHT = { full: "min-h-[100svh]", large: "min-h-[80svh]", medium: "min-h-[60svh]" } as const;

/** Mezcla `color` con transparencia (el CMS controla color y opacidad del velo). */
const veil = (color: string, pct: number) => `color-mix(in srgb, ${color} ${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%, transparent)`;

/**
 * Full-bleed hero (sección `hero` del CMS). Slow push-in on the photograph, headline revealed line by
 * line, two CTAs and a scroll cue. The fixed header overlays the top edge.
 */
export function Hero({ s, as: Heading = "h1" }: { s: Settings; /** nivel del titular (h1 salvo que otra sección ya lo sea) */ as?: "h1" | "h2" }) {
  const height = HEIGHT[oneOf(s, "height", ["full", "large", "medium"] as const, "large")];
  const op = num(s, "overlayOpacity", 0.2);
  const color = /^#[0-9a-fA-F]{6}$/.test(str(s, "overlayColor")) ? str(s, "overlayColor") : "#000000";
  const cta = safeHref(optStr(s, "ctaHref")), cta2 = safeHref(optStr(s, "secondaryCtaHref"));
  const target = optStr(s, "scrollTargetId");
  const align = oneOf(s, "alignment", ["left", "center", "right"] as const, "left");
  const img = str(s, "imageUrl");

  return (
    <section className={`relative isolate ${height} w-full overflow-hidden`}>
      <div className={`absolute inset-0 will-change-transform ${bool(s, "kenBurns", true) ? "animate-[kenburns_32s_ease-out_both]" : ""}`}>
        <PlaceholderImage label={str(s, "imageAlt", str(s, "heading"))} src={img || undefined} tone="cold" hideLabel fill priority />
      </div>

      {/* legibility: bottom + left falloff (intensidad y color desde el CMS) */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to top, ${veil(color, op)}, ${veil(color, op * 0.24)}, ${veil(color, op * 0.12)})` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to right, ${veil(color, op * 0.53)}, transparent)` }} />

      <div className={`relative z-10 flex ${height} flex-col justify-end px-gutter pb-10 pt-[calc(var(--chrome-h)+2rem)] md:pb-14 ${align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : ""}`}>
        {optStr(s, "eyebrow") && (
          <p className="font-condensed mb-5 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80" style={{ animation: "fade-up 1s var(--ease-out-expo) 0.2s both" }}>
            <span aria-hidden className="h-px w-10 bg-dept-red" />
            {str(s, "eyebrow")}
          </p>
        )}

        <Heading className="font-display text-display-2xl text-dept-white">
          <MaskHeading text={str(s, "heading")} accent={optStr(s, "headingAccent")} />
        </Heading>
        {optStr(s, "subheading") && <p className="mt-5 max-w-xl text-base text-dept-white/80 md:text-lg">{str(s, "subheading")}</p>}

        <div className="mt-8 flex w-full flex-wrap items-end justify-between gap-6 md:mt-10">
          <div className="flex flex-wrap gap-3" style={{ animation: "fade-up 1s var(--ease-out-expo) 0.7s both" }}>
            {cta && optStr(s, "ctaLabel") && (
              <Button href={cta} size="lg" arrow>
                {str(s, "ctaLabel")}
              </Button>
            )}
            {cta2 && optStr(s, "secondaryCtaLabel") && (
              <Button href={cta2} variant="outline" size="lg">
                {str(s, "secondaryCtaLabel")}
              </Button>
            )}
          </div>

          {target && optStr(s, "scrollLabel") && (
            <a
              href={`#${target}`}
              className="group hidden items-center gap-4 font-condensed text-[11px] tracking-[0.28em] text-dept-white/70 transition-colors hover:text-dept-white md:flex"
              style={{ animation: "fade-up 1s var(--ease-out-expo) 0.9s both" }}
            >
              {str(s, "scrollLabel")}
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
