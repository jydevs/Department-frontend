"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clsx } from "@/lib/clsx";

interface ProductGalleryProps {
  images: string[];
  /** product name, used for the region label */
  name: string;
  /** short description of the photo, used as alt text */
  imageLabel: string;
  className?: string;
}

/** Below `lg` the gallery is a horizontal scroll-snap carousel. */
const CAROUSEL_QUERY = "(max-width: 1023.98px)";

function subscribeCarousel(onChange: () => void) {
  const mq = window.matchMedia(CAROUSEL_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getCarouselSnapshot = () => window.matchMedia(CAROUSEL_QUERY).matches;
/* mobile-first: the server / first paint assumes the carousel layout */
const getCarouselServerSnapshot = () => true;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Product photography. ONE list of images, laid out two ways with CSS only:
 *  - `lg+`: stacked full-width 4/5 photos separated by hairlines;
 *  - below `lg`: a scroll-snap carousel (88vw slides, next one peeking) with
 *    a "01 / 03" indicator driven by an IntersectionObserver.
 */
export function ProductGallery({ images, name, imageLabel, className }: ProductGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const isCarousel = useSyncExternalStore(
    subscribeCarousel,
    getCarouselSnapshot,
    getCarouselServerSnapshot,
  );

  const total = images.length;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isCarousel || total < 2) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    scroller.querySelectorAll<HTMLElement>("[data-index]").forEach((slide) => io.observe(slide));
    return () => io.disconnect();
  }, [isCarousel, total]);

  return (
    <section aria-label={`Fotos de ${name}`} className={clsx("relative min-w-0", className)}>
      <div
        ref={scrollerRef}
        // a scrollable region must be reachable by keyboard (only while it scrolls)
        tabIndex={isCarousel && total > 1 ? 0 : undefined}
        role={isCarousel && total > 1 ? "region" : undefined}
        aria-label={isCarousel && total > 1 ? `Carrusel de fotos de ${name}` : undefined}
        className="no-scrollbar snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:snap-none lg:overflow-visible"
      >
        <ul className="flex w-max gap-px bg-white/10 lg:w-full lg:flex-col">
          {images.map((src, i) => (
            <li
              key={src}
              data-index={i}
              className="relative aspect-[4/5] w-[88vw] shrink-0 snap-start overflow-hidden bg-dept-gray-900 lg:w-full"
            >
              <Image
                src={src}
                alt={total > 1 ? `${imageLabel} — foto ${i + 1} de ${total}` : imageLabel}
                fill
                {...(i === 0 ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
                sizes="(min-width: 1024px) 60vw, 88vw"
                className="object-cover"
                data-testid="product-image"
              />
            </li>
          ))}
        </ul>
      </div>

      {total > 1 && (
        <p
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-3 bg-dept-black/80 px-2.5 py-1.5 font-condensed text-[11px] tracking-[0.2em] tabular-nums text-dept-white lg:hidden"
        >
          {pad(active + 1)} / {pad(total)}
        </p>
      )}
    </section>
  );
}
