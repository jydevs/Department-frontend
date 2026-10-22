import clsx, { type ClassValue } from "clsx";

/** Une clases condicionales (clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Valida un enlace antes de usarlo como `href`: solo `https:`, `http:` (solo localhost),
 * `mailto:`, `tel:` o rutas internas `/ruta`. Devuelve `null` si no es seguro.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const v = url.trim();
  if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || u.protocol === "mailto:" || u.protocol === "tel:") return u.toString();
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return u.toString();
  } catch {
    /* no es una URL */
  }
  return null;
}

/** true si `next` es una ruta interna segura (para `?next=`). */
export function isInternalPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && !/[\u0000-\u001f]/.test(next);
}

/**
 * La tienda y el panel viven en el mismo sitio: los enlaces a la tienda y la vista previa (iframe) son relativos y por
 * tanto del mismo origen. Para mostrar el origen en pantalla usa `storefrontLabel()`.
 */
export const STOREFRONT_URL = "";

export function storefrontLabel(): string {
  return typeof window === "undefined" ? "esta misma web" : window.location.host;
}
