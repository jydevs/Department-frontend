/** Validación de enlaces compartida (tienda y panel): solo rutas internas seguras o https. */
const CONTROL = /[\u0000-\u001f\u007f\\]/;
/** Ruta interna segura: empieza con una sola "/", sin "\\" ni caracteres de control (los navegadores los normalizan a "//host"). */
export const isSafePath = (v: string): boolean => v.startsWith("/") && !v.startsWith("//") && !CONTROL.test(v);
/** Solo permite https: o rutas internas seguras. Devuelve null si no es seguro. */
export const safeHref = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (isSafePath(url)) return url;
  if (CONTROL.test(url)) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
