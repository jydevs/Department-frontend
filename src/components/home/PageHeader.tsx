import { MaskHeading } from "@/lib/cms/text";
import { oneOf, optStr, str, type Settings } from "@/lib/cms/types";

/** Cabecera de página interior (sección `page-header`): eyebrow, titular con máscara, entradilla y texto. */
export function PageHeader({ s }: { s: Settings }) {
  const align = oneOf(s, "alignment", ["left", "center", "right"] as const, "left");
  return (
    <header className={`px-gutter pb-16 pt-[calc(var(--chrome-h)+3rem)] md:pb-24 ${align === "center" ? "text-center" : align === "right" ? "text-right" : ""}`}>
      {optStr(s, "eyebrow") && (
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          {str(s, "eyebrow")}
        </p>
      )}
      <h1 className="font-display text-display-xl text-dept-white">
        <MaskHeading text={str(s, "heading")} accent={optStr(s, "headingAccent")} />
      </h1>
      {(optStr(s, "lead") || optStr(s, "text")) && (
        <div className={`mt-10 max-w-xl md:mt-14 ${align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""}`}>
          {optStr(s, "lead") && <p className="font-display text-display-md text-dept-white">{str(s, "lead")}</p>}
          {optStr(s, "text") && <p className="mt-4 text-lg leading-relaxed text-white/70">{str(s, "text")}</p>}
        </div>
      )}
    </header>
  );
}
