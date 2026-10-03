import { isSafePath, safeHref } from "@/lib/url";

const CONTACT = /^(mailto|tel):[^\s\u0000-\u001f\u007f\\]+$/i;

/**
 * Enlace de un menú del CMS: rutas internas seguras, `#ancla`, `https:`, `mailto:` y `tel:`.
 * Cualquier otra cosa (`javascript:`, `//host`, `http:`…) devuelve `fallback` ("/").
 */
export function safeLinkHref(url: string | undefined | null, fallback = "/"): string {
  if (!url) return fallback;
  if (isSafePath(url) || (/^#[\w-]+$/.test(url))) return url;
  if (CONTACT.test(url)) return url;
  return safeHref(url) ?? fallback;
}
