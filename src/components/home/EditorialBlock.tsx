import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { InlineMarkdown, paragraphsOf } from "@/components/cms/Markdown";
import { clsx } from "@/lib/clsx";

export interface EditorialBlockProps {
  id?: string;
  eyebrow?: string;
  /** headline lines (`\n` in the CMS text) */
  lines: string[];
  lede?: string;
  /** Markdown body; a blank line starts a paragraph */
  body: string;
  imageUrl?: string;
  imageAlt: string;
  imageBadge?: string;
  layout: "text-only" | "image-left" | "image-right";
  ctaLabel?: string;
  ctaHref?: string;
  ctaVariant: "solid" | "outline" | "red";
}

/**
 * Manifesto: photograph beside the campaign text — the first paragraph is set
 * as a large lede, the rest as body copy.
 */
export function EditorialBlock({
  id,
  eyebrow,
  lines,
  lede,
  body,
  imageUrl,
  imageAlt,
  imageBadge,
  layout,
  ctaLabel,
  ctaHref,
  ctaVariant,
}: EditorialBlockProps) {
  const titleId = `${id ?? "editorial"}-title`;
  const paragraphs = paragraphsOf(body);
  const withImage = layout !== "text-only" && Boolean(imageUrl);
  const imageLeft = layout === "image-left";

  return (
    <section id={id} aria-labelledby={titleId} className="border-t border-white/10 py-section">
      <div className="grid items-center gap-12 px-gutter md:grid-cols-12 md:gap-8">
        {withImage && (
          <Reveal className={clsx("md:col-span-5", imageLeft ? "md:col-start-1" : "md:col-start-8 max-md:order-last")}>
            <div className="relative">
              <PlaceholderImage
                label={imageAlt}
                src={imageUrl}
                ratio="4 / 5"
                tone="dark"
                hideLabel
                sizes="(min-width: 768px) 42vw, 100vw"
              />
              {imageBadge && (
                <span
                  aria-hidden
                  className="font-condensed absolute -bottom-3 -right-3 hidden bg-dept-red px-4 py-2 text-[11px] tracking-[0.24em] text-dept-white md:block"
                >
                  {imageBadge}
                </span>
              )}
            </div>
          </Reveal>
        )}

        <div
          className={clsx(
            withImage
              ? imageLeft
                ? "md:col-span-6 md:col-start-7"
                : "md:col-span-6 md:col-start-1 md:row-start-1"
              : "md:col-span-8 md:col-start-3",
          )}
        >
          <Reveal>
            {eyebrow && (
              <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-gray-300">
                <span aria-hidden className="h-px w-10 bg-dept-red" />
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="font-display text-display-lg text-dept-white">
              {lines.map((line, i) =>
                i < lines.length - 1 ? (
                  <span key={i}>
                    {line}{" "}
                    <br />
                  </span>
                ) : (
                  <span key={i}>{line}</span>
                ),
              )}
            </h2>
          </Reveal>

          {lede && (
            <Reveal delay={120}>
              <p className="mt-10 text-xl font-medium leading-snug text-dept-white md:text-2xl">{lede}</p>
            </Reveal>
          )}

          {paragraphs.length > 0 && (
            <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-relaxed text-dept-white/70 md:text-base">
              {paragraphs.map((p, i) => (
                <Reveal key={i} delay={200 + i * 90}>
                  <p>
                    <InlineMarkdown text={p} />
                  </p>
                </Reveal>
              ))}
            </div>
          )}

          {ctaLabel && ctaHref && (
            <Reveal delay={420}>
              <Button href={ctaHref} variant={ctaVariant} size="lg" arrow className="mt-12">
                {ctaLabel}
              </Button>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
