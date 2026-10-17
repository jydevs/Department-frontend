/**
 * Defence-in-depth for product / collection descriptions. The API already sanitises `descriptionHtml`
 * with a whitelist; this re-applies one before the string reaches `dangerouslySetInnerHTML`:
 * only the tags below survive, they lose every attribute (except a validated `href` on <a>), `<img>`
 * and everything else is dropped, and any stray angle bracket is escaped.
 */

const ALLOWED = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "h2", "h3", "h4", "a"]);
const VOID = new Set(["br"]);

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)\/?>/g;

function escapeStray(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeHref(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > 2000) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f]/.test(value)) return null;
  if (value.startsWith("/")) return value.startsWith("//") || value.includes("\\") ? null : value;
  if (value.startsWith("https://")) return value;
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(value) || /^tel:\+?[0-9()\-.]{3,30}$/.test(value)) return value;
  return null;
}

function hrefFromAttrs(attrs: string): string | null {
  const m = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(` ${attrs}`);
  if (!m) return null;
  const decoded = (m[1] ?? m[2] ?? "").replace(/&amp;/g, "&");
  return safeHref(decoded);
}

export function sanitizeHtml(html: string): string {
  let out = "";
  let last = 0;
  let openAnchors = 0;
  TAG_RE.lastIndex = 0;
  for (let m = TAG_RE.exec(html); m !== null; m = TAG_RE.exec(html)) {
    out += escapeStray(html.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED.has(tag)) continue;
    if (closing) {
      if (VOID.has(tag)) continue;
      if (tag === "a") {
        if (openAnchors === 0) continue;
        openAnchors -= 1;
      }
      out += `</${tag}>`;
    } else if (tag === "a") {
      const href = hrefFromAttrs(m[3] ?? "");
      if (href) {
        openAnchors += 1;
        out += `<a href="${href.replace(/"/g, "&quot;")}" rel="noopener noreferrer">`;
      }
    } else {
      out += `<${tag}>`;
    }
  }
  out += escapeStray(html.slice(last));
  return out + "</a>".repeat(openAnchors);
}

/** Plain text of an HTML fragment (for meta descriptions / JSON-LD). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
