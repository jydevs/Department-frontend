"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { bff, fieldErrors } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { passwordError, type FieldErrors } from "@/lib/account/validation";
import { AuthShell, Notice, PasswordField, focusFirstInvalid, linkClass } from "./ui";

/**
 * /account/verify-email?token=… — the link proves the mailbox, so verifying also SETS the password: the API revokes
 * every earlier session (whoever registered the address first never keeps their password).
 */
export function VerifyEmailForm({ token }: { token?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenProblem, setTokenProblem] = useState(!token);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // keep the one-time token out of the address bar / history once it was read
  useEffect(() => {
    if (token && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !token) return;
    const next: FieldErrors = {};
    const pw = passwordError(password);
    if (pw) next.password = pw;
    if (!pw && confirm !== password) next.confirm = "Las contraseñas no coinciden.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const res = await bff("/verify-email", { method: "POST", body: { token, password } });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      window.setTimeout(() => router.replace("/account/login?verified=1"), 2500);
      return;
    }
    if (res.error?.code === "INVALID_TOKEN") {
      setTokenProblem(true);
      return;
    }
    const fields = fieldErrors(res.error);
    if (fields.password) {
      setErrors({ password: fields.password });
      focusFirstInvalid(formRef.current);
    }
    setFormError(describeError(res.error, res.status));
  };

  if (done) {
    return (
      <AuthShell eyebrow="Verificación" title="Correo verificado" testId="verify-email-page">
        <div className="space-y-6">
          <Notice kind="success" testId="verify-success">Tu correo quedó verificado y tu contraseña, establecida.</Notice>
          <Button href="/account/login?verified=1" variant="solid" size="lg" className="w-full">
            Iniciar sesión
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (tokenProblem) {
    return (
      <AuthShell eyebrow="Verificación" title="Enlace no válido" testId="verify-email-page">
        <div className="space-y-6">
          <Notice kind="error" testId="verify-error">
            {token ? "Este enlace no es válido, ya fue usado o venció." : "Falta el enlace de verificación. Ábrelo desde el correo que te enviamos."}
          </Notice>
          <p className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
            Puedes pedir un enlace nuevo: te enviaremos un correo para restablecer tu contraseña, y al usarlo tu correo también queda verificado.
          </p>
          <Button href="/account/forgot-password" variant="solid" size="lg" className="w-full">
            Pedir otro enlace
          </Button>
          <p className="font-condensed text-center text-xs tracking-[0.1em] text-dept-gray-400">
            <Link href="/account/login" className={linkClass}>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Verificación" title="Verifica tu correo" testId="verify-email-page">
      <p className="font-condensed mb-6 text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300">
        Para activar tu cuenta elige tu contraseña. Con ella iniciarás sesión; cualquier sesión anterior se cerrará.
      </p>
      <form ref={formRef} data-testid="verify-email-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Notice kind="error" testId="verify-form-error">{formError}</Notice>
        <PasswordField
          label="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          error={errors.password}
          hint="Mínimo 12 caracteres."
          meter
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label="Confirma la contraseña"
          name="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" variant="red" size="lg" disabled={busy} data-testid="verify-submit" className="mt-4 w-full">
          {busy ? "Verificando…" : "Verificar y continuar"}
        </Button>
      </form>
    </AuthShell>
  );
}
