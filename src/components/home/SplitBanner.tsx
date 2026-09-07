import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * 50/50 split banner with linked collections.
 * WOMEN (pink graffiti) → /collections/women
 * MEN (multicolour graffiti) → /collections/men
 * Stacks vertically on mobile, side-by-side from sm breakpoint.
 */
const HALVES = [
  {
    label: "Women",
    href: "/collections/women",
    tone: "light" as const,
    overlayClass: "bg-[#e0559b]/35 mix-blend-multiply",
  },
  {
    label: "Men",
    href: "/collections/men",
    tone: "dark" as const,
    overlayClass: "bg-gradient-to-br from-[#2a6df4]/25 via-[#f4a72a]/20 to-[#e01010]/25",
  },
];

export function SplitBanner() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2">
      {HALVES.map((half) => (
        <Link
          key={half.href}
          href={half.href}
          aria-label={`Ver colección ${half.label}`}
          className="group relative block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dept-white"
        >
          {/* Image wrapper with hover scale effect */}
          <div className="relative h-full w-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.03]">
            <PlaceholderImage
              label={`${half.label} — banner de colección`}
              ratio="4 / 5"
              tone={half.tone}
              hideLabel
              className="h-full w-full"
            />

            {/* Color overlay */}
            <span
              aria-hidden
              className={`absolute inset-0 pointer-events-none ${half.overlayClass}`}
            />
          </div>

          {/* Text label */}
          <span className="font-display absolute left-1/2 top-8 -translate-x-1/2 text-2xl sm:text-3xl text-dept-white">
            {half.label}
          </span>
        </Link>
      ))}
    </section>
  );
}
