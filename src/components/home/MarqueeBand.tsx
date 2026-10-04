import { Marquee } from "@/components/ui/Marquee";
import { blocksOf, bool, num, oneOf, optStr, str, type CmsSection } from "@/lib/cms/types";

const SIZE = { sm: "font-display text-[clamp(1.1rem,2.6vw,2rem)] leading-none", md: "font-display text-display-md", lg: "font-display text-[clamp(1.75rem,4.6vw,4.25rem)] leading-none" } as const;
const SPEED = { slow: 56, normal: 38, fast: 24 } as const;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Banda de texto en movimiento (sección `marquee`): variantes band / outline / plain. */
export function MarqueeBand({ section }: { section: CmsSection }) {
  const s = section.settings;
  const items = blocksOf(section, "item").map((b) => str(b.settings, "text")).filter(Boolean);
  if (!items.length) return null;
  const variant = oneOf(s, "variant", ["band", "outline", "plain"] as const, "band");
  const size = SIZE[oneOf(s, "size", ["sm", "md", "lg"] as const, "md")];
  const bg = HEX.test(str(s, "backgroundColor")) ? str(s, "backgroundColor") : undefined;
  const fg = HEX.test(str(s, "textColor")) ? str(s, "textColor") : undefined;
  const sepColor = HEX.test(str(s, "separatorColor")) ? str(s, "separatorColor") : undefined;
  const duration = num(s, "duration", SPEED[oneOf(s, "speed", ["slow", "normal", "fast"] as const, "normal")]);
  const border = bool(s, "bordered") ? "border-y border-white/10" : "";

  const itemClass = variant === "outline" ? `${size} text-transparent [-webkit-text-stroke:1.5px_var(--dept-white)]` : variant === "plain" ? `${size} text-white/80` : size;
  const wrap = variant === "band" ? `py-4 md:py-6 ${bg ? "" : "bg-dept-white text-dept-black"}` : "py-5 md:py-6";

  return (
    <div className={`${wrap} ${border}`} style={{ background: variant === "band" ? bg : undefined, color: variant === "band" ? fg : undefined }} aria-label={optStr(s, "ariaLabel")}>
      <Marquee
        items={items}
        duration={duration}
        separator={optStr(s, "separator") ?? "✦"}
        separatorClassName={sepColor ? "" : "text-dept-red"}
        itemClassName={itemClass}
        separatorColor={sepColor}
      />
    </div>
  );
}
