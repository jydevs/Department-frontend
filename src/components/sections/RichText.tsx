import { Markdown } from "@/components/cms/Markdown";
import { Reveal } from "@/components/ui/Reveal";
import { clsx } from "@/lib/clsx";

export interface RichTextProps {
  id?: string;
  heading?: string;
  /** Markdown */
  body: string;
  alignment: "left" | "center" | "right";
  maxWidth: "narrow" | "normal" | "wide";
  /** first section of a page: leave room for the fixed header */
  first: boolean;
}

const WIDTH: Record<RichTextProps["maxWidth"], string> = {
  narrow: "max-w-xl",
  normal: "max-w-3xl",
  wide: "max-w-5xl",
};

/** Free text block (Markdown) for CMS pages. */
export function RichText({ id, heading, body, alignment, maxWidth, first }: RichTextProps) {
  return (
    <section
      id={id}
      className={clsx(
        "px-gutter",
        first ? "pb-section pt-[calc(var(--chrome-h)+3rem)]" : "py-section",
        alignment === "center" && "text-center",
        alignment === "right" && "text-right",
      )}
    >
      <Reveal className={clsx(WIDTH[maxWidth], alignment === "center" && "mx-auto", alignment === "right" && "ml-auto")}>
        {heading &&
          (first ? (
            <h1 className="font-display text-display-xl text-dept-white">{heading}</h1>
          ) : (
            <h2 className="font-display text-display-lg text-dept-white">{heading}</h2>
          ))}
        <Markdown source={body} className={clsx("text-[15px] leading-relaxed text-dept-white/70 md:text-base", heading && "mt-8")} />
      </Reveal>
    </section>
  );
}
