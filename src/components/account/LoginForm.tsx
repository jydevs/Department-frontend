"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/account/config";
import { describeError } from "@/lib/account/errors";
import { useCustomer } from "@/lib/account/useCustomer";
import { validEmail } from "@/lib/account/validation";
import { AuthShell, Field, Notice, PasswordField, linkClass } from "./ui";

/** Login. `next` is validated (internal paths only) before it is ever used to redirect. */
export function LoginForm({ next, notice }: { next?: string; notice?: "reset" | "verified" | "deleted" }) {
  const router = useRouter();
  const { status, login } = useCustomer();
  const target = safeNextPath(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  // already signed in: nothing to do here
  useEffect(() => {
    if (status === "authenticated" && !done.current) {
      done.current = true;
      router.replace(target);
    }
  }, [status, router, target]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!validEmail(email)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }
    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await login(email.trim(), password);
    if (res.ok) {
      done.current = true;
      router.replace(target);
      router.refresh();
      return;
    }
    setBusy(false);
    setPassword("");
    setError(res.status === 401 ? "El correo o la contraseña no son correctos." : describeError(res.error, res.status));
  };

  const notices = {
    reset: "Tu contraseña se actualizó. Inicia sesión con la nueva.",
    verified: "Tu correo quedó verificado. Ya puedes iniciar sesión con tu nueva contraseña.",
    deleted: "Tu cuenta fue eliminada.",
  } as const;

  return (
    <AuthShell eyebrow="Cuenta" title="Iniciar sesión">
      {notice && <div className="mb-5"><Notice kind="success" testId="login-notice">{notices[notice]}</Notice></div>}
      <form data-testid="login-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Notice kind="error" testId="login-error">{error}</Notice>

        <Field
          label="Correo electrónico"
          type="email"
          name="email"
          data-testid="login-email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          required
        />

        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aside={
            <Link href="/account/forgot-password" className="font-condensed mb-2 text-[11px] tracking-[0.1em] text-dept-gray-500 hover:text-dept-white">
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        <Button type="submit" variant="red" size="lg" data-testid="login-submit" disabled={busy} className="mt-4 w-full">
          {busy ? "Entrando…" : "Entrar"}
        </Button>

        <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
          ¿No tienes cuenta?{" "}
          <Link href="/account/register" className={linkClass}>
            Crear una
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
