import { Marquee } from "@/components/ui/Marquee";

const ITEMS = [
  "Uniforms for the unnoticed",
  "Rags to Riches",
  "Regular members only",
  "Extended Version",
];

/** White ticker strip between the hero and the first section. */
export function MarqueeBand() {
  return (
    <div className="bg-dept-white py-4 text-dept-black md:py-6" aria-label="Uniforms for the unnoticed">
      <Marquee
        items={ITEMS}
        duration={46}
        separatorClassName="text-dept-red"
        itemClassName="font-display text-[clamp(1.75rem,4.6vw,4.25rem)] leading-none"
      />
    </div>
  );
}
