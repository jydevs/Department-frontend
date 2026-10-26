import { Markdown } from "@/components/ui/Markdown";
import { Reveal } from "@/components/ui/Reveal";
import { oneOf, optStr, str, type Settings } from "@/lib/cms/types";

const WIDTH = { narrow: "max-w-xl", normal: "max-w-3xl", wide: "max-w-5xl" } as const;

/** Texto enriquecido (sección `rich-text`): Markdown seguro (sin HTML). */
export function RichText({ s }: { s: Settings }) {
  const align = oneOf(s, "alignment", ["left", "center", "right"] as const, "left");
  return (
    <section className="px-gutter py-section">
      <Reveal className={`${WIDTH[oneOf(s, "maxWidth", ["narrow", "normal", "wide"] as const, "normal")]} ${align === "center" ? "mx-auto text-center" : align === "right" ? "ml-auto text-right" : ""}`}>
        {optStr(s, "heading") && <h2 className="font-display text-display-lg mb-8 text-dept-white">{str(s, "heading")}</h2>}
        <Markdown source={str(s, "body")} className="space-y-4 text-base leading-relaxed text-dept-white/80" />
      </Reveal>
    </section>
  );
}
