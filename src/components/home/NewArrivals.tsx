import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { products } from "@/data/products";

/**
 * "New arrivals": a full-bleed night shot with a scroll-driven parallax, giant
 * outlined type and a single CTA. (Was a video slot in the reference — swap the
 * photo for a <video autoPlay muted loop playsInline> once the clip exists.)
 */
export function NewArrivals() {
  return (
    <section
      id="new-arrivals"
      className="relative isolate flex min-h-[92svh] items-end overflow-hidden"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="parallax-y absolute -inset-y-[12%] inset-x-0">
          <PlaceholderImage
            label="Lookbook — el grupo de noche, de pie"
            src="/images/new-arrivals.jpg"
            tone="cold"
            hideLabel
            fill
          />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />

      <div className="grid w-full items-end gap-10 px-gutter py-section md:grid-cols-[1fr_auto]">
        <div>
          <Reveal>
            <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
              <span aria-hidden className="h-px w-10 bg-dept-red" />
              01 — Nuevos ingresos · {String(products.length).padStart(2, "0")} piezas
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="font-display text-display-2xl text-dept-white">
              New
              <span className="text-outline block">Arrivals</span>
            </h2>
          </Reveal>
        </div>

        <Reveal delay={220} className="max-w-sm">
          <p className="font-condensed text-lg leading-snug tracking-[0.1em] text-dept-white md:text-xl">
            We were not born to follow rules, but to rewrite them.
          </p>
          <Button href="/collections/all" variant="solid" size="lg" arrow className="mt-8">
            Ver novedades
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
