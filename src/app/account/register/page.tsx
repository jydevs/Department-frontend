"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AuthCard, EMAIL_RE, Field, FormError, PASSWORD_HINT } from "@/components/account/ui";
import { register } from "@/lib/account";
import { ApiError, friendlyError } from "@/lib/api/errors";

export default function RegisterPage() {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", acceptsMarketing: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); setError(null); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.firstName.trim()) errs.firstName = "Introduce tu nombre";
    if (!f.lastName.trim()) errs.lastName = "Introduce tu apellido";
    if (!EMAIL_RE.test(f.email.trim())) errs.email = "Introduce un correo electrónico válido";
    if (f.password.length < 12) errs.password = "La contraseña debe tener al menos 12 caracteres";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      await register(f);
      setSent(f.email.trim());
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        const fe = err.fieldErrors();
        setErrors({ email: fe.email ? "Correo no válido" : "", password: fe.password ? "Contraseña no válida (12 a 256 caracteres)" : "", firstName: fe.firstName ? "Nombre no válido" : "", lastName: fe.lastName ? "Apellido no válido" : "" });
      }
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthCard eyebrow="Cuenta" title="Revisa tu correo para verificar tu cuenta" testId="register-sent" center>
        <p role="status" className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300 mb-4">
          Si <span className="text-dept-white">{sent}</span> puede registrarse, te enviamos un enlace para verificar tu correo y activar la cuenta.
        </p>
        <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-400 mb-8">
          En ese enlace elegirás la contraseña de tu cuenta; hasta entonces no podrás iniciar sesión. Si no llega en unos minutos, revisa la carpeta de spam o pide un enlace nuevo desde «Recuperar contraseña».
        </p>
        <Button href="/account/login" variant="red" size="lg" className="w-full" data-testid="register-back">Volver a iniciar sesión</Button>
        <Button href="/account/forgot-password" variant="outline" size="lg" className="mt-3 w-full" data-testid="register-resend">Reenviar enlace</Button>
        <button type="button" onClick={() => setSent(null)} className="font-condensed mt-5 text-xs tracking-[0.1em] text-dept-gray-300 underline underline-offset-4">Usar otro correo</button>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Cuenta" title="Crear cuenta">
      <form data-testid="register-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormError id="register-error">{error}</FormError>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" autoComplete="given-name" data-testid="register-first-name" value={f.firstName} error={errors.firstName} required onChange={(e) => set("firstName", e.target.value)} />
          <Field label="Apellido" autoComplete="family-name" data-testid="register-last-name" value={f.lastName} error={errors.lastName} required onChange={(e) => set("lastName", e.target.value)} />
        </div>
        <Field label="Correo electrónico" type="email" autoComplete="email" data-testid="register-email" value={f.email} error={errors.email} required onChange={(e) => set("email", e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="new-password" data-testid="register-password" value={f.password} error={errors.password} hint={PASSWORD_HINT} required onChange={(e) => set("password", e.target.value)} />
        <label className="font-condensed flex items-start gap-3 text-xs tracking-[0.08em] text-dept-gray-300">
          <input type="checkbox" checked={f.acceptsMarketing} onChange={(e) => set("acceptsMarketing", e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-dept-red,#e11d2e)]" />
          Quiero recibir novedades y ofertas por correo.
        </label>
        <Button type="submit" variant="red" size="lg" data-testid="register-submit" disabled={busy} className="w-full mt-4">
          {busy ? "Creando…" : "Registrarse"}
        </Button>
        <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/account/login" className="text-dept-white underline underline-offset-4">Inicia sesión</Link>
        </p>
      </form>
    </AuthCard>
  );
}
