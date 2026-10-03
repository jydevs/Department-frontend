import { Fragment, type ReactNode } from "react";
import { safeHref } from "@/lib/admin/format";

/** Renderer Markdown mínimo y seguro: nunca inserta HTML; los enlaces pasan por `safeHref`. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else {
      const [, label, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t) ?? [];
      const href = safeHref(url);
      out.push(href ? <a key={k++} href={href} rel="noopener noreferrer" target="_blank" className="text-accent-text underline">{label}</a> : <Fragment key={k++}>{label}</Fragment>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className={className ?? "space-y-3 text-sm leading-relaxed"}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        const h = /^(#{1,3}) (.*)/.exec(b);
        if (h) return <p key={i} className={h[1].length === 1 ? "text-xl font-bold" : "text-base font-semibold"}>{inline(h[2])}</p>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
