"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AuthCard, EMAIL_RE, Field, FormError } from "@/components/account/ui";
import { forgotPassword } from "@/lib/account";
import { friendlyError } from "@/lib/api/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Introduce un correo electrónico válido");
    setError(null);
    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard eyebrow="Recuperación" title="Recuperar contraseña">
      {sent ? (
        <div className="space-y-6" data-testid="forgot-password-sent">
          <p role="status" className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
            Si existe una cuenta asociada a <span className="text-dept-white">{email.trim()}</span>, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Button href="/account/login" variant="solid" size="lg" className="w-full">Volver a iniciar sesión</Button>
        </div>
      ) : (
        <form data-testid="forgot-password-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormError id="forgot-password-error">{error}</FormError>
          <Field label="Correo electrónico" type="email" autoComplete="email" data-testid="forgot-password-email" value={email} required
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }} />
          <Button type="submit" variant="red" size="lg" data-testid="forgot-password-submit" disabled={busy} className="w-full mt-4">
            {busy ? "Enviando…" : "Enviar instrucciones"}
          </Button>
          <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
            ¿Recuerdas tu contraseña?{" "}
            <Link href="/account/login" className="text-dept-white underline underline-offset-4">Inicia sesión</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
