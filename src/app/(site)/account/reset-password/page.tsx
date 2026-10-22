"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Introduce un correo electrónico válido");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          Recuperación
        </p>
        <h1 className="font-display text-display-md text-dept-white mb-6">Restablecer contraseña</h1>

        {submitted ? (
          <div className="space-y-6">
            <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
              Si existe una cuenta asociada a <span className="text-dept-white">{email}</span>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Button href="/account/login" variant="solid" size="lg" className="w-full">
              Volver a iniciar sesión
            </Button>
          </div>
        ) : (
          <form data-testid="reset-password-form" onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <p className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">
                {error}
              </p>
            )}

            <div>
              <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
              />
            </div>

            <Button type="submit" variant="red" size="lg" className="w-full mt-4">
              Enviar instrucciones
            </Button>

            <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
              ¿Recuerdas tu contraseña?{" "}
              <Link href="/account/login" className="text-dept-white underline underline-offset-4">
                Inicia sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
