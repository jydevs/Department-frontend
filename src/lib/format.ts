const COP = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0, useGrouping: "always" });

/**
 * Formato de precios de la tienda: pesos colombianos enteros con puntos de millar y sufijo "COP",
 * p. ej. "$99.000 COP" (la API trabaja con enteros; no se muestran decimales).
 */
export function formatCOP(amount: number): string {
  return `$${COP.format(amount)} COP`;
}

/** Teléfono tal como lo acepta la API (`+?` y 7 a 20 dígitos): sin espacios, guiones, puntos ni paréntesis; el prefijo +57 es opcional. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-().]/g, "");
  if (p.startsWith("+57") && p.length > 3) p = p.slice(3);
  else if (p.startsWith("0057") && p.length > 4) p = p.slice(4);
  else if (/^57\d{10}$/.test(p)) p = p.slice(2);
  return p;
}
export const isValidPhone = (normalized: string): boolean => /^\+?[0-9]{7,20}$/.test(normalized);
