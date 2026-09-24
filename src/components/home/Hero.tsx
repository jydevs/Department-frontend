import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";

/**
 * Full-bleed hero. Slow push-in on the photograph, headline revealed line by
 * line, two CTAs and a scroll cue. The fixed header overlays the top edge.
 */
export function Hero() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden">
      {/* photograph (slow push-in) */}
      <div className="absolute inset-0 animate-[kenburns_32s_ease-out_both] will-change-transform">
        <PlaceholderImage
          label="Lookbook Rags to Riches — cuatro amigas con la camiseta All We Need Is Baddies, de noche"
          src="/images/home-hero.jpg"
          tone="cold"
          hideLabel
          fill
          priority
        />
      </div>

      {/* legibility: bottom + left falloff */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

      <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-gutter pb-10 pt-[calc(var(--chrome-h)+2rem)] md:pb-14">
        <p
          className="font-condensed mb-5 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80"
          style={{ animation: "fade-up 1s var(--ease-out-expo) 0.2s both" }}
        >
          <span aria-hidden className="h-px w-10 bg-dept-red" />
          Rags to Riches — Extended Version
        </p>

        <h1 className="font-display text-display-2xl text-dept-white">
          <span className="mask-line">
            <span className="mask-line-inner" style={{ ["--d" as string]: "150ms" }}>
              Uniforms for
            </span>
          </span>
          <span className="mask-line">
            <span className="mask-line-inner" style={{ ["--d" as string]: "290ms" }}>
              the unnoticed<span className="text-dept-red">.</span>
            </span>
          </span>
        </h1>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6 md:mt-10">
          <div
            className="flex flex-wrap gap-3"
            style={{ animation: "fade-up 1s var(--ease-out-expo) 0.7s both" }}
          >
            <Button href="/collections/all" size="lg" arrow>
              Ver colección
            </Button>
            <Button href="/pages/contact" variant="outline" size="lg">
              Lookbook
            </Button>
          </div>

          <a
            href="#new-arrivals"
            className="group hidden items-center gap-4 font-condensed text-[11px] tracking-[0.28em] text-dept-white/70 transition-colors hover:text-dept-white md:flex"
            style={{ animation: "fade-up 1s var(--ease-out-expo) 0.9s both" }}
          >
            Scroll
            <span aria-hidden className="relative block h-12 w-px overflow-hidden bg-white/25">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_var(--ease-in-out-quart)_infinite] bg-dept-white" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
