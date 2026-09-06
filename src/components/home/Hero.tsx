import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * Full-bleed hero section: cold blue-toned background image with "UNIFORMS FOR THE UNNOTICED."
 * headline overlaid bottom-left. Fills the full viewport height to accommodate the absolute-positioned
 * header overlay from layout.tsx.
 */
export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background image: cold-toned placeholder */}
      <PlaceholderImage
        label="Hero — dos personas con pasamontañas, tono azul frío"
        tone="cold"
        hideLabel
        fill
      />

      {/* Scrim: gradient for text legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

      {/* Headline: positioned bottom-left, above scrim and image */}
      <h1 className="font-display absolute bottom-8 left-6 md:bottom-12 md:left-10 max-w-[12ch] text-4xl sm:text-6xl lg:text-8xl leading-[0.9] text-dept-white">
        UNIFORMS FOR THE UNNOTICED.
      </h1>
    </section>
  );
}
