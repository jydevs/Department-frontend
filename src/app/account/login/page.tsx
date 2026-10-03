"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AuthCard, EMAIL_RE, Field, FormError } from "@/components/account/ui";
import { login } from "@/lib/account";
import { friendlyError } from "@/lib/api/errors";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = params.get("reset") ? "Contraseña actualizada. Inicia sesión con la nueva." : params.get("verified") ? "Correo verificado. Ya puedes iniciar sesión." : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Introduce un correo electrónico válido");
    if (!password) return setError("Introduce tu contraseña");
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <AuthCard eyebrow="Cuenta" title="Iniciar sesión">
      <form data-testid="login-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {notice && <p role="status" data-testid="login-notice" className="font-condensed text-xs tracking-[0.1em] text-dept-white">{notice}</p>}
        <FormError id="login-error">{error}</FormError>
        <Field label="Correo electrónico" type="email" autoComplete="email" data-testid="login-email" value={email} required
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }} />
        <div>
          <Field label="Contraseña" type="password" autoComplete="current-password" data-testid="login-password" value={password} required
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }} />
          <div className="mt-2 text-right">
            <Link href="/account/forgot-password" className="font-condensed text-[11px] tracking-[0.1em] text-dept-gray-500 hover:text-dept-white">¿Olvidaste tu contraseña?</Link>
          </div>
        </div>
        <Button type="submit" variant="red" size="lg" data-testid="login-submit" disabled={busy} className="w-full mt-4">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
          ¿No tienes cuenta?{" "}
          <Link href="/account/register" className="text-dept-white underline underline-offset-4">Crear una</Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
