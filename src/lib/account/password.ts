import { PASSWORD_MAX, PASSWORD_MIN } from "./config";

export interface PasswordStrength {
  /** 0..4 */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** hard rule of the API: 12..256 characters */
  valid: boolean;
  /** advice to make it stronger, most useful first */
  tips: string[];
}

const COMMON = ["password", "contrasena", "contraseña", "123456", "12345678", "qwerty", "abcdef", "111111", "admin", "colombia", "letmein", "welcome", "daregular"];

const LABELS = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"] as const;

function hasSequence(value: string): boolean {
  const lower = value.toLowerCase();
  for (let i = 0; i + 3 < lower.length; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    const d = lower.charCodeAt(i + 3);
    if (b - a === 1 && c - b === 1 && d - c === 1) return true;
    if (a - b === 1 && b - c === 1 && c - d === 1) return true;
  }
  return false;
}

/** Local helper for the strength meter. The only authority is the API (12..256 characters). */
export function assessPassword(password: string, context: string[] = []): PasswordStrength {
  const length = password.length;
  const valid = length >= PASSWORD_MIN && length <= PASSWORD_MAX;
  const tips: string[] = [];

  if (length === 0) return { score: 0, label: "", valid: false, tips: [`Usa al menos ${PASSWORD_MIN} caracteres.`] };

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const lower = password.toLowerCase();
  const weak =
    COMMON.some((word) => lower.includes(word)) ||
    /(.)\1{3,}/.test(password) ||
    hasSequence(password) ||
    context.some((part) => part.length >= 4 && lower.includes(part.toLowerCase()));

  if (length < PASSWORD_MIN) tips.push(`Te faltan ${PASSWORD_MIN - length} caracteres (mínimo ${PASSWORD_MIN}).`);
  if (length > PASSWORD_MAX) tips.push(`Máximo ${PASSWORD_MAX} caracteres.`);
  if (weak) tips.push("Evita palabras comunes, secuencias (abcd, 1234), repeticiones y tus datos personales.");
  if (classes < 3) tips.push("Mezcla mayúsculas, minúsculas, números y símbolos.");
  if (length < 16) tips.push("Una frase de 4 o más palabras es más fuerte y fácil de recordar.");

  let score = 0;
  if (valid) {
    score = 1;
    if (classes >= 2 || length >= 16) score = 2;
    if (classes >= 3 && length >= 14) score = 3;
    if (length >= 16 && classes >= 3) score = 4;
    if (length >= 20 && classes >= 2) score = 4;
    if (weak) score = Math.min(score, 2);
  }
  return { score: score as PasswordStrength["score"], label: LABELS[score], valid, tips: tips.slice(0, 3) };
}
