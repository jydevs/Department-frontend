import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

export type LookbookAspect = "1/1" | "2/3" | "3/4" | "4/5";

export interface LookbookPhoto {
  id: string;
  imageUrl: string;
  alt: string;
  caption?: string;
  /** links the photo to a product page */
  productHandle?: string;
  aspect: LookbookAspect;
}

export interface LookbookGalleryProps {
  id?: string;
  heading?: string;
  ariaLabel?: string;
  layout: "grid" | "carousel" | "masonry";
  /** desktop columns (mobile is always 2) */
  columns: "2" | "3" | "4";
  showCaptions: boolean;
  photos: LookbookPhoto[];
}

const ASPECT: Record<LookbookAspect, string> = {
  "1/1": "aspect-[1/1]",
  "2/3": "aspect-[2/3]",
  "3/4": "aspect-[3/4]",
  "4/5": "aspect-[4/5]",
};

const MASONRY_COLUMNS: Record<LookbookGalleryProps["columns"], string> = {
  "2": "md:columns-2",
  "3": "md:columns-3",
  "4": "md:columns-4",
};

const GRID_COLUMNS: Record<LookbookGalleryProps["columns"], string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-4",
};

const SIZES: Record<LookbookGalleryProps["columns"], string> = {
  "2": "(min-width: 768px) 50vw, 50vw",
  "3": "(min-width: 768px) 33vw, 50vw",
  "4": "(min-width: 768px) 25vw, 50vw",
};

function Photo({ photo, sizes, showCaption }: { photo: LookbookPhoto; sizes: string; showCaption: boolean }) {
  const figure = (
    <figure className={`group relative overflow-hidden bg-dept-gray-900 ${ASPECT[photo.aspect]}`}>
      <Image
        src={photo.imageUrl}
        alt={photo.alt}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
      />
      {showCaption && photo.caption && (
        <figcaption
          aria-hidden
          className="font-condensed pointer-events-none absolute left-3 top-3 bg-dept-black/70 px-2 py-1 text-[11px] tracking-[0.2em] text-dept-white opacity-100 transition-opacity duration-500 ease-out-expo md:opacity-0 md:group-hover:opacity-100"
        >
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
  return photo.productHandle ? (
    <Link href={`/products/${photo.productHandle}`} aria-label={photo.alt} className="block">
      {figure}
    </Link>
  ) : (
    figure
  );
}

/** Community lookbook. masonry = CSS columns (default), grid = even rows, carousel = swipeable strip. Server component; Reveal is the only client bit. */
export function LookbookGallery({ id, heading, ariaLabel, layout, columns, showCaptions, photos }: LookbookGalleryProps) {
  if (photos.length === 0) return null;
  const sizes = SIZES[columns];

  const list =
    layout === "carousel" ? (
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-px overflow-x-auto">
        {photos.map((photo) => (
          <li key={photo.id} className="w-[70vw] shrink-0 snap-start md:w-[32vw]">
            <Photo photo={photo} sizes="(min-width: 768px) 32vw, 70vw" showCaption={showCaptions} />
          </li>
        ))}
      </ul>
    ) : layout === "grid" ? (
      <ul className={`grid grid-cols-2 gap-px ${GRID_COLUMNS[columns]}`}>
        {photos.map((photo, i) => (
          <Reveal key={photo.id} as="li" delay={(i % 3) * 90}>
            <Photo photo={photo} sizes={sizes} showCaption={showCaptions} />
          </Reveal>
        ))}
      </ul>
    ) : (
      <ul className={`columns-2 gap-px ${MASONRY_COLUMNS[columns]}`}>
        {photos.map((photo, i) => (
          <Reveal key={photo.id} as="li" delay={(i % 3) * 90} className="mb-px break-inside-avoid">
            <Photo photo={photo} sizes={sizes} showCaption={showCaptions} />
          </Reveal>
        ))}
      </ul>
    );

  return (
    <section id={id} aria-label={ariaLabel} className="border-t border-white/10">
      {heading && <h2 className="font-display px-gutter py-10 text-display-lg text-dept-white">{heading}</h2>}
      {list}
    </section>
  );
}
