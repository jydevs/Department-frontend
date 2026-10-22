"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { bff, fieldErrors } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { passwordError, type FieldErrors } from "@/lib/account/validation";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { AuthShell, Notice, PasswordField, focusFirstInvalid } from "./ui";

/** /account/reset-password?token=… — without a token it offers the "request a link" form instead. */
export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenProblem, setTokenProblem] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  if (!token) return <ForgotPasswordForm testId="reset-password-form" />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
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
    const res = await bff("/reset-password", { method: "POST", body: { token, password } });
    if (res.ok) {
      router.replace("/account/login?reset=1");
      return;
    }
    setBusy(false);
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

  if (tokenProblem) {
    return (
      <AuthShell eyebrow="Recuperación" title="Enlace no válido" testId="reset-password-invalid">
        <div className="space-y-6">
          <Notice kind="error" testId="reset-error">Este enlace no es válido, ya fue usado o venció.</Notice>
          <Button href="/account/forgot-password" variant="solid" size="lg" className="w-full">
            Pedir otro enlace
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Recuperación" title="Elige una contraseña nueva">
      <form ref={formRef} data-testid="reset-password-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Notice kind="error" testId="reset-form-error">{formError}</Notice>
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
        <p className="font-condensed text-[11px] leading-relaxed tracking-[0.06em] text-dept-gray-500">
          Al guardar cerraremos tus sesiones abiertas en todos los dispositivos.
        </p>
        <Button type="submit" variant="red" size="lg" disabled={busy} data-testid="reset-submit" className="mt-4 w-full">
          {busy ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthShell>
  );
}
