import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { blocksOf, bool, optStr, str, type CmsSection } from "@/lib/cms/types";

const ASPECT: Record<string, string> = { "1/1": "aspect-square", "2/3": "aspect-[2/3]", "3/4": "aspect-[3/4]", "4/5": "aspect-[4/5]" };

/** Lookbook (sección `lookbook`): mosaico por columnas CSS (masonry), cuadrícula o carrusel horizontal. */
export function LookbookGallery({ section }: { section: CmsSection }) {
  const s = section.settings;
  const photos = blocksOf(section, "photo").filter((p) => optStr(p.settings, "imageUrl"));
  if (!photos.length) return null;
  const layout = str(s, "layout", "masonry");
  const cols = str(s, "columns", "3");
  const colClass = cols === "2" ? "md:columns-2" : cols === "4" ? "md:columns-4" : "md:columns-3";
  const captions = bool(s, "showCaptions", true);
  const list = layout === "carousel" ? "flex snap-x gap-px overflow-x-auto no-scrollbar" : layout === "grid" ? `grid grid-cols-2 gap-px ${cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3"}` : `columns-2 gap-px ${colClass}`;

  return (
    <section aria-label={optStr(s, "ariaLabel")} className="border-t border-white/10">
      {optStr(s, "heading") && <h2 className="font-display text-display-lg px-gutter py-10 text-dept-white">{str(s, "heading")}</h2>}
      <ul className={list}>
        {photos.map((p, i) => {
          const t = p.settings;
          const product = optStr(t, "productHandle");
          const fig = (
            <figure className={`group relative overflow-hidden bg-dept-gray-900 ${ASPECT[str(t, "aspect", "2/3")] ?? "aspect-[2/3]"} ${layout === "carousel" ? "w-[70vw] shrink-0 snap-start md:w-[28vw]" : ""}`}>
              <Image src={str(t, "imageUrl")} alt={str(t, "alt")} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105" />
              {captions && optStr(t, "caption") && (
                <figcaption aria-hidden className="font-condensed pointer-events-none absolute left-3 top-3 bg-dept-black/70 px-2 py-1 text-[11px] tracking-[0.2em] text-dept-white opacity-100 transition-opacity duration-500 ease-out-expo md:opacity-0 md:group-hover:opacity-100">
                  {str(t, "caption")}
                </figcaption>
              )}
            </figure>
          );
          return (
            <Reveal key={p.id} as="li" delay={(i % 3) * 90} className={layout === "masonry" ? "mb-px break-inside-avoid" : ""}>
              {product ? <Link href={`/products/${encodeURIComponent(product)}`} aria-label={str(t, "alt")}>{fig}</Link> : fig}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
