"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(formData.email.trim())) {
      setError("Introduce un correo electrónico válido");
      return;
    }
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", "mock-jwt-token");
      localStorage.setItem("auth_user", JSON.stringify({ email: formData.email, name: formData.name }));
    }
    router.push("/account/orders");
  };

  return (
    <div className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          Cuenta
        </p>
        <h1 className="font-display text-display-md text-dept-white mb-6">Crear cuenta</h1>

        <form data-testid="register-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <p className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">
              {error}
            </p>
          )}

          <div>
            <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
            />
          </div>

          <div>
            <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (error) setError(null);
              }}
              required
              className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
            />
          </div>

          <div>
            <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
            />
          </div>

          <Button type="submit" variant="red" size="lg" className="w-full mt-4">
            Registrarse
          </Button>

          <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/account/login" className="text-dept-white underline underline-offset-4">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
