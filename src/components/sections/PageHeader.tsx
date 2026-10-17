import { clsx } from "@/lib/clsx";

export interface PageHeaderProps {
  id?: string;
  eyebrow?: string;
  /** headline lines (`\n` in the CMS text); each one is revealed with a mask animation */
  lines: string[];
  headingAccent?: string;
  lead?: string;
  text?: string;
  alignment: "left" | "center" | "right";
}

/** Header of a CMS page ("Comunidad / Daregular Members"). Starts below the fixed chrome. */
export function PageHeader({ id, eyebrow, lines, headingAccent, lead, text, alignment }: PageHeaderProps) {
  return (
    <header
      id={id}
      className={clsx(
        "px-gutter pb-16 pt-[calc(var(--chrome-h)+3rem)] md:pb-24",
        alignment === "center" && "text-center",
        alignment === "right" && "text-right",
      )}
    >
      {eyebrow && (
        <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
          <span aria-hidden className="mr-3 inline-block h-px w-8 bg-dept-red align-middle" />
          {eyebrow}
        </p>
      )}
      {lines.length > 0 && (
        <h1 className="font-display text-display-xl text-dept-white">
          {lines.map((line, i) => (
            <span key={i} className="mask-line">
              <span className="mask-line-inner" style={i > 0 ? { ["--d" as string]: `${i * 120}ms` } : undefined}>
                {line}
                {i === lines.length - 1 && headingAccent ? <span className="text-dept-red">{headingAccent}</span> : null}
                {i < lines.length - 1 ? " " : null}
              </span>
            </span>
          ))}
        </h1>
      )}
      {(lead || text) && (
        <div
          className={clsx(
            "mt-10 max-w-xl md:mt-14",
            alignment === "center" && "mx-auto",
            alignment === "right" && "ml-auto",
          )}
        >
          {lead && <p className="font-display text-display-md text-dept-white">{lead}</p>}
          {text && <p className={clsx("text-lg leading-relaxed text-white/70", lead && "mt-4")}>{text}</p>}
        </div>
      )}
    </header>
  );
}
