"use client";

import { TokenPasswordForm } from "@/components/account/TokenPasswordForm";
import { resetPassword } from "@/lib/account";

export default function ResetPasswordPage() {
  return (
    <TokenPasswordForm
      testId="reset-password" eyebrow="Recuperación" title="Nueva contraseña" intro="Elige una contraseña nueva. Se cerrarán todas tus sesiones abiertas."
      submitLabel="Guardar contraseña" busyLabel="Guardando…" doneQuery="reset" action={resetPassword}
      retryHref="/account/forgot-password" retryLabel="Solicitar enlace nuevo"
    />
  );
}
