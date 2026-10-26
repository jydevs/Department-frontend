/**
 * Validaciones de cliente que replican las reglas del backend (zod) para que el error salga antes de llamar a la API
 * y en español. Todas devuelven el valor normalizado o lanzan `Error` con un mensaje legible.
 */

const PHONE_RE = /^\+?[0-9]{7,20}$/;
/** Quita espacios, guiones, puntos y paréntesis: "+57 300-123 4567" → "+573001234567". */
export const normalizePhone = (v: string): string => v.trim().replace(/[\s\-().]/g, "");

/** Teléfono opcional: vacío → `null`. */
export function optionalPhone(v: string, label = "El teléfono"): string | null {
  const p = normalizePhone(v);
  if (!p) return null;
  if (!PHONE_RE.test(p)) throw new Error(`${label} no es válido: usa solo números (7 a 20 dígitos), con "+" opcional al inicio. Ej.: +573001234567`);
  return p;
}
/** Teléfono obligatorio. */
export function requiredPhone(v: string, label = "El teléfono"): string {
  const p = optionalPhone(v, label);
  if (!p) throw new Error(`${label} es obligatorio`);
  return p;
}

/** Entero opcional dentro de [min, max]; `null`/`undefined` pasan. */
export function checkInt(v: number | null | undefined, label: string, min: number, max: number): void {
  if (v == null) return;
  if (!Number.isInteger(v)) throw new Error(`${label} debe ser un número entero`);
  if (v < min || v > max) throw new Error(`${label} debe estar entre ${min.toLocaleString("es-CO")} y ${max.toLocaleString("es-CO")}`);
}

/** Texto con longitud mínima/máxima (tras recortar espacios). */
export function checkText(v: string, label: string, min: number, max: number): string {
  const t = v.trim();
  if (t.length < min) throw new Error(min <= 1 ? `${label} es obligatorio` : `${label} debe tener al menos ${min} caracteres`);
  if (t.length > max) throw new Error(`${label} no puede superar ${max} caracteres`);
  return t;
}

/** ¿El número tiene como máximo 2 decimales? (tolerante a errores de coma flotante) */
export const hasMax2Decimals = (n: number): boolean => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
