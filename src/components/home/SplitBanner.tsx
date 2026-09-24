import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { getCollectionProducts } from "@/data/products";

/**
 * 50/50 collection entry: WOMEN → /collections/women, MEN → /collections/men.
 * Photos start slightly desaturated and bloom on hover; a square arrow fills in.
 * Stacks on mobile.
 */
const TILES = [
  {
    label: "Women",
    handle: "women" as const,
    src: "/images/banner-women.jpg",
    alt: "Colección Women — mujer de pie frente a un muro con grafiti",
  },
  {
    label: "Men",
    handle: "men" as const,
    src: "/images/banner-men.jpg",
    alt: "Colección Men — grupo posando frente a un muro",
  },
];

export function SplitBanner() {
  return (
    <section aria-label="Colecciones" className="grid gap-px bg-white/10 md:grid-cols-2">
      {TILES.map((tile, i) => {
        const count = getCollectionProducts(tile.handle).length;
        return (
          <Reveal key={tile.handle} delay={i * 120} className="h-full bg-dept-black">
            <Link
              href={`/collections/${tile.handle}`}
              aria-label={`Ver colección ${tile.label}`}
              className="group relative block aspect-[4/5] overflow-hidden md:aspect-auto md:h-[92svh]"
            >
              <PlaceholderImage
                label={tile.alt}
                src={tile.src}
                tone="dark"
                hideLabel
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                imgClassName="saturate-[0.8] transition-[transform,filter] duration-[1600ms] ease-out-expo group-hover:scale-105 group-hover:saturate-100"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-[var(--gutter)]">
                <div>
                  <p className="font-condensed mb-3 text-[11px] tracking-[0.28em] text-dept-white/80">
                    0{i + 1} — {String(count).padStart(2, "0")} piezas
                  </p>
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
