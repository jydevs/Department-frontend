"use client";

import type { ReactNode } from "react";
import { resolveMediaSrc } from "@/lib/admin/api/media";
import { safeHref } from "@/lib/admin/utils";

/**
 * Renderizador de Markdown mínimo y seguro: construye elementos React (nunca HTML crudo).
 * Soporta párrafos, títulos, listas, citas, código, negrita, cursiva, enlaces e imágenes con URLs validadas.
 */

const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\))/;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest.length) {
    const m = INLINE_RE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const key = `${keyBase}-${n++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(<strong key={key}>{renderInline(tok.slice(2, -2), key)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.9em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("![")) {
      const mm = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(tok);
      const src = mm ? resolveMediaSrc(mm[2]) : null;
      // eslint-disable-next-line @next/next/no-img-element
      out.push(src ? <img key={key} src={src} alt={mm?.[1] ?? ""} className="my-2 max-h-48 rounded" /> : <span key={key}>{mm?.[1] ?? ""}</span>);
    } else if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      const href = mm ? safeHref(mm[2]) : null;
      out.push(
        href && mm ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-accent-text underline">
            {renderInline(mm[1], key)}
          </a>
        ) : (
          <span key={key}>{mm?.[1] ?? tok}</span>
        ),
      );
    } else {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const flushPara = (buf: string[]) => {
    if (!buf.length) return;
    const key = `p${k++}`;
    blocks.push(
      <p key={key} className="my-2">
        {buf.flatMap((l, idx) => (idx === 0 ? renderInline(l, `${key}-${idx}`) : [<br key={`${key}-br${idx}`} />, ...renderInline(l, `${key}-${idx}`)]))}
      </p>,
    );
  };

  let para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      flushPara(para);
      para = [];
      i++;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(para);
      para = [];
      const level = h[1].length;
      const key = `h${k++}`;
      const cls = level <= 2 ? "mt-4 mb-2 text-xl font-semibold" : "mt-3 mb-1.5 text-base font-semibold";
      blocks.push(
        level <= 2 ? (
          <h3 key={key} className={cls}>
            {renderInline(h[2], key)}
          </h3>
        ) : (
          <h4 key={key} className={cls}>
            {renderInline(h[2], key)}
          </h4>
        ),
      );
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      flushPara(para);
      para = [];
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={`c${k++}`} className="my-2 overflow-x-auto rounded bg-surface-3 p-2 font-mono text-xs">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara(para);
      para = [];
      blocks.push(<hr key={`hr${k++}`} className="my-3 border-border" />);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara(para);
      para = [];
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      const key = `q${k++}`;
      blocks.push(
        <blockquote key={key} className="my-2 border-l-2 border-border-strong pl-3 text-muted">
          {renderInline(q.join(" "), key)}
        </blockquote>,
      );
      continue;
    }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara(para);
      para = [];
      const ordered = !!ol;
      const re = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const mm = re.exec(lines[i]);
        if (!mm) break;
        items.push(mm[1]);
        i++;
      }
      const key = `l${k++}`;
      const lis = items.map((t, idx) => <li key={`${key}-${idx}`}>{renderInline(t, `${key}-${idx}`)}</li>);
      blocks.push(ordered ? (
        <ol key={key} className="my-2 list-decimal pl-5">
          {lis}
        </ol>
      ) : (
        <ul key={key} className="my-2 list-disc pl-5">
          {lis}
        </ul>
      ));
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara(para);

  return <div className="text-sm leading-relaxed break-words">{blocks.length ? blocks : <p className="text-muted">Nada que previsualizar todavía.</p>}</div>;
}
