import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * SCAFFOLD STUB — flesh out in `feature/split-banner`.
 * 50/50 banner: WOMEN (pink graffiti) links to /collections/women,
 * MEN (multicolour graffiti) links to /collections/men. Stacks on mobile.
 */
const HALVES = [
  { label: "Women", href: "/collections/women", tone: "accent" as const },
  { label: "Men", href: "/collections/men", tone: "dark" as const },
];

export function SplitBanner() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2">
      {HALVES.map((half) => (
        <Link key={half.href} href={half.href} className="group relative block">
          <PlaceholderImage
            label={`${half.label} — banner de colección`}
            ratio="4 / 5"
            tone={half.tone}
            hideLabel
          />
          <span className="font-display absolute left-6 top-6 text-3xl text-dept-white">
            {half.label}
          </span>
        </Link>
      ))}
    </section>
  );
}
