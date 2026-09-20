import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";

const PHOTO_COUNT = 10;

/** Alternating crops give the columns an uneven, editorial rhythm (source photos are all 2:3). */
const ASPECTS = ["aspect-[2/3]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[3/4]"] as const;

const photos = Array.from({ length: PHOTO_COUNT }, (_, i) => {
  const n = i + 1;
  const label = String(n).padStart(2, "0");
  return {
    n,
    label,
    src: `/images/community-${label}.jpg`,
    alt: `Lookbook Daregular Dept. — foto ${n}`,
    aspect: ASPECTS[(i * 3 + Math.floor(i / 4)) % ASPECTS.length],
  };
});

/** CSS-columns masonry of the community lookbook. Server component; Reveal is the only client bit. */
export function LookbookGallery() {
  return (
    <ul className="columns-2 gap-px md:columns-3">
      {photos.map((photo, i) => (
        <Reveal key={photo.src} as="li" delay={(i % 3) * 90} className="mb-px break-inside-avoid">
          <figure className={`group relative overflow-hidden bg-dept-gray-900 ${photo.aspect}`}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
            />
            <figcaption
              aria-hidden
              className="font-condensed pointer-events-none absolute left-3 top-3 bg-dept-black/70 px-2 py-1 text-[11px] tracking-[0.2em] text-dept-white opacity-100 transition-opacity duration-500 ease-out-expo md:opacity-0 md:group-hover:opacity-100"
            >
              N°{photo.label}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </ul>
  );
}
