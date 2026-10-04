import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Reveal } from "@/components/ui/Reveal";
import { getCollectionCount } from "@/lib/api/catalog";
import { blocksOf, bool, optStr, str, type CmsSection } from "@/lib/cms/types";
import { safeHref } from "@/lib/url";

/**
 * Entrada 50/50 a colecciones (sección `split-banner`, bloques `tile`). Las fotos arrancan algo
 * desaturadas y florecen al pasar el cursor; en móvil se apilan.
 */
export async function SplitBanner({ section }: { section: CmsSection }) {
  const s = section.settings;
  const tiles = blocksOf(section, "tile");
  if (!tiles.length) return null;
  const counts = bool(s, "showCount", true) ? await Promise.all(tiles.map((t) => (optStr(t.settings, "collectionHandle") ? getCollectionCount(str(t.settings, "collectionHandle")).then((n) => n ?? undefined) : Promise.resolve(undefined)))) : [];
  const numbered = bool(s, "numbered", true);

  return (
    <section aria-label={optStr(s, "ariaLabel")} className="grid gap-px bg-white/10 md:grid-cols-2" style={{ background: optStr(s, "backgroundColor") }}>
      {tiles.map((tile, i) => {
        const t = tile.settings;
        const label = str(t, "label");
        const eyebrow = [numbered ? `0${i + 1}` : null, counts[i] !== undefined ? `${String(counts[i]).padStart(2, "0")} ${str(s, "countLabel", "piezas")}` : null].filter(Boolean).join(" — ");
        return (
          <Reveal key={tile.id} delay={i * 120} className="h-full bg-dept-black">
            <Link
              href={optStr(t, "collectionHandle") ? `/collections/${encodeURIComponent(str(t, "collectionHandle"))}` : (safeHref(optStr(t, "href")) ?? "/")}
              aria-label={optStr(t, "ariaLabel") ?? label}
              className="group relative block aspect-[4/5] overflow-hidden md:aspect-auto md:h-[92svh]"
            >
              <PlaceholderImage
                label={str(t, "imageAlt", label)}
                src={optStr(t, "imageUrl")}
                tone="dark"
                hideLabel
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                imgClassName="saturate-[0.8] transition-[transform,filter] duration-[1600ms] ease-out-expo group-hover:scale-105 group-hover:saturate-100"
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-[var(--gutter)]">
                <div>
                  {eyebrow && <p className="font-condensed mb-3 text-[11px] tracking-[0.28em] text-dept-white/80">{eyebrow}</p>}
                  <span className="font-display block text-display-xl text-dept-white transition-transform duration-700 ease-out-expo group-hover:translate-x-2">{label}</span>
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
