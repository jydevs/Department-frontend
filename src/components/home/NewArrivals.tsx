import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * New Arrivals section with VHS-style video background.
 * Full-bleed hero section featuring centered heading and tagline
 * overlaid on a grainy video backdrop with scanline effect.
 */
export function NewArrivals() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-dept-black">
      {/*
        Fondo. TODO: sustituir por
        <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src="/video/new-arrivals.mp4" type="video/mp4" />
        </video>
        con el clip real (estética VHS). Mientras tanto, placeholder frío:
      */}
      <PlaceholderImage
        label="New arrivals — clip de vídeo con estética VHS"
        tone="cold"
        hideLabel
        fill
      />

      {/* VHS scanline and vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/30"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* Centered content */}
      <div className="relative z-10 px-6 text-center">
        <h2 className="font-display text-dept-white text-4xl sm:text-6xl lg:text-7xl">
          NEW ARRIVALS
        </h2>
        <p className="font-body mx-auto mt-4 max-w-sm text-sm text-dept-white/80">
          We were not born to follow rules, but to rewrite them.
        </p>
      </div>
    </section>
  );
}
