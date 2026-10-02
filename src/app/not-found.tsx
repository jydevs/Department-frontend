import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Marquee } from "@/components/ui/Marquee";

export const metadata: Metadata = { title: "404" };

const TICKER = [
  "PÁGINA NO ENCONTRADA",
  "UNIFORMS FOR THE UNNOTICED",
  "404",
  "DAREGULAR DEPT.",
];

/** On-brand 404 — the label literally sells a "404" print, so we lean into it. */
export default function NotFound() {
  return (
    <div data-testid="not-found-page" className="flex min-h-screen flex-col pt-[var(--chrome-h)]">
      <section className="flex flex-1 flex-col justify-center px-gutter py-12 md:py-16">
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          Error
        </p>

        <h1 aria-label="404" className="font-display text-[clamp(8rem,32vw,34rem)] leading-[0.85] text-dept-white">
          <span className="mask-line" aria-hidden>
            <span className="mask-line-inner">
              <span className="text-transparent [-webkit-text-stroke:3px_var(--dept-white)]">4</span>
              <span className="text-dept-red">0</span>
              <span className="text-transparent [-webkit-text-stroke:3px_var(--dept-white)]">4</span>
            </span>
          </span>
        </h1>
      </section>

      <div className="border-y border-white/10 py-5 md:py-6">
        <Marquee
          items={TICKER}
          duration={30}
          itemClassName="font-display text-display-md text-white/80"
        />
      </div>

      <section className="flex flex-col gap-8 px-gutter py-12 md:flex-row md:items-center md:justify-between md:py-16">
        <p className="max-w-md text-lg leading-snug text-white/70 md:text-xl">
          Esta página no existe — o nunca la vieron.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/" variant="solid" size="lg" arrow>
            Volver al inicio
          </Button>
          <Button href="/collections/all" variant="outline" size="lg">
            Ver clothes
          </Button>
        </div>
      </section>
    </div>
  );
}
