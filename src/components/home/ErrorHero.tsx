import { optStr, str, type Settings } from "@/lib/cms/types";

/** Cabecera de error (sección `error-hero`): código gigante con contorno (404). */
export function ErrorHero({ s }: { s: Settings }) {
  const code = str(s, "code", "404");
  return (
    <section className="flex flex-1 flex-col justify-center px-gutter pb-12 pt-[calc(var(--chrome-h)+2rem)] md:pb-16">
      {optStr(s, "eyebrow") && (
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          {str(s, "eyebrow")}
        </p>
      )}
      <h1 aria-label={optStr(s, "ariaLabel") ?? code} className="font-display text-[clamp(8rem,32vw,34rem)] leading-[0.85] text-dept-white">
        <span className="mask-line" aria-hidden>
          <span className="mask-line-inner">
            {[...code].map((ch, i) =>
              i === 1 ? (
                <span key={i} className="text-dept-red">{ch}</span>
              ) : (
                <span key={i} className="text-transparent [-webkit-text-stroke:3px_var(--dept-white)]">{ch}</span>
              ),
            )}
          </span>
        </span>
      </h1>
    </section>
  );
}
