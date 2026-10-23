import { cn } from "@/lib/admin/utils";
import type { PasswordStrength } from "@/lib/admin/api/account";

const STRENGTH_COLORS = ["bg-surface-3", "bg-danger", "bg-warning", "bg-info", "bg-success"];

/** Medidor y lista de requisitos de una contraseña nueva (se anuncia a lectores de pantalla). */
export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-surface-3")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Fortaleza: {strength.label}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        {strength.checks.map((c) => (
          <li key={c.label} className={c.ok ? "text-success" : undefined}>{c.ok ? "✓" : "○"} {c.label}</li>
        ))}
      </ul>
    </div>
  );
}

/** Valida los campos de «cambiar contraseña» con los requisitos del backend (12–256 caracteres, distinta de la actual). */
export function validateNewPassword(current: string, next: string, confirm: string, strength: PasswordStrength): Record<string, string> {
  const e: Record<string, string> = {};
  if (!current) e.current = "Escribe tu contraseña actual.";
  if (next.length < 12) e.new = "Mínimo 12 caracteres.";
  else if (next.length > 256) e.new = "Máximo 256 caracteres.";
  else if (next === current) e.new = "Debe ser distinta de la actual.";
  else if (strength.score < 2) e.new = "Es demasiado débil: mezcla mayúsculas, números y símbolos.";
  if (confirm !== next) e.confirm = "Las contraseñas no coinciden.";
  return e;
}
