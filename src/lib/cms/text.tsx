import { Fragment, type ReactNode } from "react";

/** "A\nB" → ["A", "B"] (los titulares del CMS usan saltos de línea). */
export const lines = (text: string): string[] => text.split("\n").map((l) => l.trim()).filter(Boolean);

/** Titular de varias líneas con el efecto `mask-line`; `accent` se añade en rojo a la última línea. */
export function MaskHeading({ text, accent }: { text: string; accent?: string }): ReactNode {
  const ls = lines(text);
  return ls.map((l, i) => (
    <span className="mask-line" key={i}>
      <span className="mask-line-inner" style={{ ["--d" as string]: `${i * 70}ms` }}>
        {l}
        {i === ls.length - 1 && accent ? <span className="text-dept-red">{accent}</span> : null}
        {i < ls.length - 1 ? " " : null}
      </span>
    </span>
  ));
}

/** Titular con saltos de línea como <br /> (títulos que no usan `mask-line`). */
export function BrHeading({ text }: { text: string }): ReactNode {
  const ls = lines(text);
  return ls.map((l, i) => (
    <Fragment key={i}>
      {l}
      {i < ls.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

/** Eyebrow de la marca: filete rojo + texto. */
export function Eyebrow({ text, tone = "gray-300" }: { text: string; tone?: "gray-300" | "white" }) {
  return (
    <p className={`font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] ${tone === "white" ? "text-dept-white/80" : "text-dept-gray-300"}`}>
      <span aria-hidden className="h-px w-10 bg-dept-red" />
      {text}
    </p>
  );
}

/** Párrafos separados por línea en blanco (texto plano; React escapa todo). */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return text.split(/\n{2,}/).map((p, i) => (
    <p key={i} className={className}>
      {p}
    </p>
  ));
}
