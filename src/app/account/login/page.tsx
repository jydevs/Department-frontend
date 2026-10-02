"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Introduce un correo electrónico válido");
      return;
    }
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", "mock-jwt-token");
      localStorage.setItem("auth_user", JSON.stringify({ email }));
    }
    router.push("/account/orders");
  };

  return (
    <div className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          Cuenta
        </p>
        <h1 className="font-display text-display-md text-dept-white mb-6">Iniciar sesión</h1>

        <form data-testid="login-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <p data-testid="login-error" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">
              {error}
            </p>
          )}

          <div>
            <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              data-testid="login-email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              required
              className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300">
                Contraseña
              </label>
              <Link
                href="/account/reset-password"
                className="font-condensed text-[11px] tracking-[0.1em] text-dept-gray-500 hover:text-dept-white"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
            />
          </div>

          <Button type="submit" variant="red" size="lg" data-testid="login-submit" className="w-full mt-4">
            Entrar
          </Button>

          <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
            ¿No tienes cuenta?{" "}
            <Link href="/account/register" className="text-dept-white underline underline-offset-4">
              Crear una
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
