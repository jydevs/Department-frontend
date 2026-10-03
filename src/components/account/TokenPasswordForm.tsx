"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AuthCard, Field, FormError, PASSWORD_HINT } from "./ui";
import { friendlyError } from "@/lib/api/errors";

interface Props {
  eyebrow: string; title: string; intro: string; submitLabel: string; busyLabel: string; testId: string;
  /** a dónde ir al terminar (con aviso en el login) */
  doneQuery: string;
  action: (token: string, password: string) => Promise<unknown>;
  /** a dónde ofrecer pedir un enlace nuevo cuando el actual no sirve */
  retryHref: string; retryLabel: string;
}

function Form(p: Props) {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  if (token.length < 20 || expired) {
    return (
      <AuthCard eyebrow={p.eyebrow} title="Enlace no válido" testId={`${p.testId}-invalid`} center>
        <p role="alert" className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300 mb-8">
          El enlace no es válido o ya venció. Solicita uno nuevo.
        </p>
        <Button href={p.retryHref} variant="solid" size="lg" className="w-full">{p.retryLabel}</Button>
      </AuthCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 12) return setFieldError("La contraseña debe tener al menos 12 caracteres");
    if (password !== confirm) return setFieldError("Las contraseñas no coinciden");
    setFieldError("");
    setError(null);
    setBusy(true);
    try {
      await p.action(token, password);
      router.push(`/account/login?${p.doneQuery}=1`);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "INVALID_TOKEN") setExpired(true);
      else setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <AuthCard eyebrow={p.eyebrow} title={p.title} testId={`${p.testId}-page`}>
      <p className="font-condensed mb-6 text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">{p.intro}</p>
      <form data-testid={`${p.testId}-form`} onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormError id={`${p.testId}-error`}>{error}</FormError>
        <Field label="Nueva contraseña" type="password" autoComplete="new-password" data-testid={`${p.testId}-password`} value={password} hint={PASSWORD_HINT} required
          onChange={(e) => { setPassword(e.target.value); setFieldError(""); }} />
        <Field label="Repite la contraseña" type="password" autoComplete="new-password" data-testid={`${p.testId}-confirm`} value={confirm} error={fieldError} required
          onChange={(e) => { setConfirm(e.target.value); setFieldError(""); }} />
        <Button type="submit" variant="red" size="lg" data-testid={`${p.testId}-submit`} disabled={busy} className="w-full mt-4">{busy ? p.busyLabel : p.submitLabel}</Button>
        <p className="font-condensed mt-6 text-center text-xs tracking-[0.1em] text-dept-gray-400">
          <Link href="/account/login" className="text-dept-white underline underline-offset-4">Volver a iniciar sesión</Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function TokenPasswordForm(p: Props) {
  return <Suspense fallback={null}><Form {...p} /></Suspense>;
}
