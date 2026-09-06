import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * SCAFFOLD STUB — flesh out in `feature/hero-section`.
 * Full-bleed hero: cold blue-toned photo of two people in balaclavas,
 * headline "UNIFORMS FOR THE UNNOTICED." overlaid bottom-left.
 */
export function Hero() {
  return (
    <section className="relative">
      <PlaceholderImage
        label="Hero — dos personas con pasamontañas, tono azul frío"
        ratio="16 / 10"
        tone="cold"
        hideLabel
      />
      <div className="absolute bottom-10 left-6 max-w-xl">
        <h1 className="font-display text-5xl text-dept-white sm:text-7xl">
          Uniforms for the unnoticed.
        </h1>
      </div>
    </section>
  );
}
