"use client";

import { TokenPasswordForm } from "@/components/account/TokenPasswordForm";
import { verifyEmail } from "@/lib/account";

export default function VerifyEmailPage() {
  return (
    <TokenPasswordForm
      testId="verify-email" eyebrow="Verificación" title="Verifica tu correo" intro="Para activar tu cuenta, elige tu contraseña. Al confirmar, tu correo queda verificado y podrás iniciar sesión."
      submitLabel="Verificar y activar" busyLabel="Verificando…" doneQuery="verified" action={verifyEmail}
      retryHref="/account/register" retryLabel="Crear cuenta de nuevo"
    />
  );
}
