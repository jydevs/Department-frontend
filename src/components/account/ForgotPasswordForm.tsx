"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { bff } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { validEmail } from "@/lib/account/validation";
import { AuthShell, Field, Notice, linkClass } from "./ui";

/** Asks for a reset link. The answer is always the same, so it never reveals whether the account exists. */
export function ForgotPasswordForm({ testId = "forgot-password-form" }: { testId?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!validEmail(email)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await bff("/forgot-password", { method: "POST", body: { email: email.trim() } });
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(describeError(res.error, res.status));
  };

  return (
    <AuthShell eyebrow="Recuperación" title="Restablecer contraseña">
      {sent ? (
        <div className="space-y-6">
          <Notice kind="success" testId="forgot-success">
            Si existe una cuenta con <span className="text-dept-white">{email.trim()}</span>, te enviamos un enlace para restablecer tu contraseña. Vence en 60 minutos.
          </Notice>
          <Button href="/account/login" variant="solid" size="lg" className="w-full">
            Volver a iniciar sesión
          </Button>
        </div>
      ) : (
        <form data-testid={testId} onSubmit={handleSubmit} noValidate className="space-y-5">
          <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
            Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
          </p>
          <Notice kind="error" testId="forgot-error">{error}</Notice>
          <Field
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
          />
          <Button type="submit" variant="red" size="lg" disabled={busy} data-testid="forgot-submit" className="mt-4 w-full">
            {busy ? "Enviando…" : "Enviar instrucciones"}
          </Button>
          <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
            ¿Recuerdas tu contraseña?{" "}
            <Link href="/account/login" className={linkClass}>
              Inicia sesión
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
