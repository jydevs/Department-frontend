import Link from "next/link";
import type { ReactNode } from "react";
import { isSafeLink } from "@/lib/cms/reader";

/**
 * Tiny, dependency-free Markdown renderer for CMS text: paragraphs, #/##/### headings, - and 1. lists,
 * **bold**, *italic* and [links](url). It never emits raw HTML (everything is React text) and links
 * must pass the same safe-URL rule the backend enforces.
 */

const INLINE_SOURCE = String.raw`\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_`;

export function InlineMarkdown({ text }: { text: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(new RegExp(INLINE_SOURCE, "g"))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined && m[2] !== undefined) {
      const href = m[2];
      if (!isSafeLink(href)) nodes.push(m[1]);
      else if (href.startsWith("/")) {
        nodes.push(
          <Link key={key++} href={href} className="underline underline-offset-4 hover:text-dept-red-light">
            {m[1]}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={key++}
            href={href}
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-dept-red-light"
          >
            {m[1]}
          </a>,
        );
      }
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key++}>{m[3]}</strong>);
    } else {
      nodes.push(<em key={key++}>{m[4] ?? m[5]}</em>);
    }
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

/** Paragraphs of a Markdown string (blank line = new paragraph); lines inside one paragraph are joined. */
export function paragraphsOf(source: string): string[] {
  return source
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 0);
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; level: 2 | 3 | 4; text: string }
  | { kind: "ul" | "ol"; items: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of source.split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0]);
    if (heading && lines.length === 1) {
      blocks.push({ kind: "h", level: (heading[1].length + 1) as 2 | 3 | 4, text: heading[2] });
    } else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      blocks.push({ kind: "ul", items: lines.map((l) => l.replace(/^\s*[-*]\s+/, "")) });
    } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      blocks.push({ kind: "ol", items: lines.map((l) => l.replace(/^\s*\d+[.)]\s+/, "")) });
    } else {
      blocks.push({ kind: "p", text: lines.join(" ").trim() });
    }
  }
  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.kind === "h") {
          const Tag = `h${block.level}` as "h2" | "h3" | "h4";
          return (
            <Tag key={i} className="font-display mt-10 text-display-md text-dept-white first:mt-0">
              <InlineMarkdown text={block.text} />
            </Tag>
          );
        }
        if (block.kind === "ul" || block.kind === "ol") {
          const List = block.kind;
          return (
            <List key={i} className={`mt-5 space-y-2 pl-6 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineMarkdown text={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.kind !== "p") return null;
        return (
          <p key={i} className="mt-5 first:mt-0">
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
