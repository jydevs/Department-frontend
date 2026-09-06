import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * SCAFFOLD STUB — flesh out in `feature/new-arrivals`.
 * Full-bleed section with a grainy VHS-style video background,
 * centred "NEW ARRIVALS" + subtitle.
 */
export function NewArrivals() {
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
      <PlaceholderImage
        label="New arrivals — clip de vídeo con grano VHS"
        ratio="16 / 9"
        tone="cold"
        hideLabel
        className="absolute inset-0 h-full"
      />
      <div className="relative px-6 text-center">
        <h2 className="font-display text-4xl text-dept-white sm:text-6xl">
          New Arrivals
        </h2>
        <p className="font-body mx-auto mt-4 max-w-md text-sm text-dept-white/80">
          We were not born to follow rules, but to rewrite them.
        </p>
      </div>
    </section>
  );
}
