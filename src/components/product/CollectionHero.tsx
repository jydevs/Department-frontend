import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import type { Collection } from "@/data/types";
import { clsx } from "@/lib/clsx";
import { blocksOf, bool, optStr, str, type CmsSection } from "@/lib/cms/types";

/** Cabecera de colección (sección `collection-hero`): foto desaturada con parallax, título gigante y pestañas de colecciones. */
export function CollectionHero({ section, collection, count, more = false }: { section: CmsSection; collection: Collection; count: number; /** hay más piezas que las cargadas */ more?: boolean }) {
  const s = section.settings;
  const tabs = blocksOf(section, "tab");
  const img = optStr(s, "imageUrl") ?? collection.heroImage;
  const op = typeof s.overlayOpacity === "number" ? s.overlayOpacity : 0.4;
  const overlay = /^#[0-9a-fA-F]{6}$/.test(str(s, "overlayColor")) ? str(s, "overlayColor") : "#000000";
  const mix = (p: number) => `color-mix(in srgb, ${overlay} ${Math.round(Math.min(1, p) * 100)}%, transparent)`;

  return (
    <section className={clsx("relative isolate flex items-end overflow-hidden", str(s, "minHeight") === "large" ? "min-h-[75svh]" : "min-h-[58svh]")}>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={clsx(bool(s, "parallax", true) ? "parallax-y absolute -inset-y-[10%]" : "absolute inset-y-0", "inset-x-0")}>
          <PlaceholderImage label={collection.heroImageLabel} src={img} tone="dark" hideLabel fill priority className={bool(s, "grayscale", true) ? "grayscale" : undefined} />
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: `linear-gradient(to top, ${mix(1)}, ${mix(op)}, ${mix(op * 0.75)})` }} />

      <div className="flex w-full flex-wrap items-end justify-between gap-x-8 gap-y-6 px-gutter pb-8 pt-[calc(var(--chrome-h)+3rem)] md:pb-12">
        <div>
          <p className="font-condensed mb-4 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-white/80">
            <span aria-hidden className="h-px w-10 bg-dept-red" />
            {optStr(s, "eyebrow") ?? "Colección"}
            {bool(s, "showCount", true) ? ` — ${String(count).padStart(2, "0")}${more ? "+" : ""} ${str(s, "countLabel", "piezas")}` : ""}
          </p>
          <h1 data-testid="collection-title" className="font-display text-display-2xl text-dept-white">
            {collection.title}
            <span className="sr-only"> {collection.handle}</span>
          </h1>
        </div>

        {bool(s, "showTabs", true) && tabs.length > 0 && (
          <nav aria-label={str(s, "tabsLabel", "Colecciones")} className="flex gap-2 pb-2">
            {tabs.map((t) => {
              const h = str(t.settings, "collectionHandle");
              return (
                <Link
                  key={t.id}
                  href={`/collections/${encodeURIComponent(h)}`}
                  aria-current={h === collection.handle ? "page" : undefined}
                  className={clsx(
                    "font-condensed border px-5 py-2.5 text-[11px] tracking-[0.22em] transition-colors duration-300 ease-out-expo",
                    h === collection.handle ? "border-dept-white bg-dept-white text-dept-black" : "border-white/30 text-dept-white hover:border-dept-white hover:bg-white/10",
                  )}
                >
                  {str(t.settings, "label")}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </section>
  );
}
