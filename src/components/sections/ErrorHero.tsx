export interface ErrorHeroProps {
  id?: string;
  eyebrow?: string;
  /** big code, e.g. "404": first and last characters are outlined, the middle ones use the accent colour */
  code: string;
  ariaLabel?: string;
}

const OUTLINE = "text-transparent [-webkit-text-stroke:3px_var(--dept-white)]";

/** Oversized error code of the 404 page — the label literally sells a "404" print, so we lean into it. */
export function ErrorHero({ id, eyebrow, code, ariaLabel }: ErrorHeroProps) {
  const chars = Array.from(code);
  const first = chars[0] ?? "";
  const last = chars.length > 1 ? chars[chars.length - 1] : "";
  const middle = chars.slice(1, chars.length > 1 ? -1 : undefined).join("");

  return (
    <section id={id} className="flex flex-1 flex-col justify-center px-gutter py-12 md:py-16">
      {eyebrow && (
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          {eyebrow}
        </p>
      )}

      <h1
        aria-label={ariaLabel ?? code}
        className="font-display text-[clamp(8rem,32vw,34rem)] leading-[0.85] text-dept-white"
      >
        <span className="mask-line" aria-hidden>
          <span className="mask-line-inner">
            <span className={OUTLINE}>{first}</span>
            {middle && <span className="text-dept-red">{middle}</span>}
            {last && <span className={OUTLINE}>{last}</span>}
          </span>
        </span>
      </h1>
    </section>
  );
}
