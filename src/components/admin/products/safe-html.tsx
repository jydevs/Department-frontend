import { createElement, type ReactNode } from "react";
import { safeHref } from "@/lib/admin/utils";

/**
 * Convierte el HTML de la descripción (lista blanca del servidor: p, br, strong, em, ul, ol, li, h2-h4, a[https])
 * en elementos React. NO usa dangerouslySetInnerHTML: cualquier etiqueta fuera de la lista se descarta (se
 * conserva su texto, salvo script/style que se eliminan completos) y los enlaces pasan por safeHref.
 */

const ALLOWED = new Set(["p", "br", "strong", "em", "ul", "ol", "li", "h2", "h3", "h4", "a"]);
const DROP_CONTENT = /^(script|style|iframe|object|embed|template|noscript)$/i;

interface Node {
  tag: string | null; // null = raíz
  href?: string | null;
  children: Array<Node | string>;
}

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#x27);/gi, (_, e: string) => {
    switch (e.toLowerCase()) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
      case "#39":
      case "#x27":
        return "'";
      default:
        return " ";
    }
  });
}

function parse(html: string): Node {
  const root: Node = { tag: null, children: [] };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+|<)/g;
  let m: RegExpExecArray | null;
  const top = () => stack[stack.length - 1];
  while ((m = re.exec(html)) !== null) {
    const whole = m[0];
    if (m[3] !== undefined) {
      top().children.push(decodeEntities(m[3]));
      continue;
    }
    if (!m[1]) continue; // comentario
    const tag = m[1].toLowerCase();
    const closing = whole.startsWith("</");
    if (!closing && DROP_CONTENT.test(tag)) {
      const end = new RegExp(`</${tag}\\s*>`, "i");
      const rest = html.slice(re.lastIndex);
      const found = end.exec(rest);
      re.lastIndex = found ? re.lastIndex + found.index + found[0].length : html.length;
      continue;
    }
    if (!ALLOWED.has(tag)) continue;
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (tag === "br") {
      top().children.push({ tag: "br", children: [] });
      continue;
    }
    const node: Node = { tag, children: [] };
    if (tag === "a") {
      const hm = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[2] ?? "");
      node.href = safeHref(decodeEntities(hm?.[1] ?? hm?.[2] ?? hm?.[3] ?? ""));
    }
    top().children.push(node);
    if (!whole.endsWith("/>")) stack.push(node);
  }
  return root;
}

const CLASSES: Record<string, string> = {
  p: "mb-3 last:mb-0",
  ul: "mb-3 list-disc pl-6",
  ol: "mb-3 list-decimal pl-6",
  li: "mb-1",
  h2: "mb-2 mt-4 text-lg font-semibold",
  h3: "mb-2 mt-3 text-base font-semibold",
  h4: "mb-2 mt-3 text-sm font-semibold",
  strong: "font-semibold",
  em: "italic",
};

function toReact(node: Node | string, key: number): ReactNode {
  if (typeof node === "string") return node;
  const kids = node.children.map((c, i) => toReact(c, i));
  if (node.tag === "br") return createElement("br", { key });
  if (node.tag === "a") {
    if (!node.href) return createElement("span", { key }, ...kids);
    return createElement("a", { key, href: node.href, target: "_blank", rel: "noopener noreferrer", className: "text-info underline" }, ...kids);
  }
  if (node.tag === null) return kids;
  return createElement(node.tag, { key, className: CLASSES[node.tag] }, ...kids);
}

export function renderSafeHtml(html: string): ReactNode {
  const root = parse(html);
  return root.children.map((c, i) => toReact(c, i));
}

/** Vista previa de una descripción HTML. */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  if (!html.trim()) return <p className={className}>Sin descripción.</p>;
  return <div className={className}>{renderSafeHtml(html)}</div>;
}

/** Texto plano aproximado de un HTML (para resúmenes y SEO). */
export function htmlToText(html: string): string {
  const root = parse(html);
  const out: string[] = [];
  const walk = (n: Node | string) => {
    if (typeof n === "string") out.push(n);
    else {
      n.children.forEach(walk);
      if (n.tag && ["p", "li", "h2", "h3", "h4", "br"].includes(n.tag)) out.push(" ");
    }
  };
  walk(root);
  return out.join("").replace(/\s+/g, " ").trim();
}
