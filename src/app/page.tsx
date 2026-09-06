import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * SCAFFOLD home page. Each section below is delivered by its own feature branch
 * (see TASKS.md) and will replace the corresponding placeholder here.
 */
export default function HomePage() {
  return (
    <div>
      <section className="relative">
        <PlaceholderImage
          label="Hero — two people in balaclavas, cold blue tone"
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

      <section className="px-6 py-24 text-center">
        <h2 className="font-display text-4xl sm:text-6xl">New Arrivals</h2>
        <p className="font-body mx-auto mt-4 max-w-md text-sm text-dept-gray-300">
          We were not born to follow rules, but to rewrite them.
        </p>
      </section>
    </div>
  );
}
