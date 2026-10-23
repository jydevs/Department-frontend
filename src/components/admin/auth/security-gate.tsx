"use client";

import { useState, type ReactNode } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Button, Input, useToast } from "@/components/admin/ui";
import { Notice, apiMessage } from "@/components/admin/settings/shared";
import { Brand } from "@/components/admin/shell/sidebar";
import { EnableDialog } from "@/components/admin/account/two-factor-card";
import { PasswordStrengthMeter, validateNewPassword } from "@/components/admin/account/password-strength";
import { useAuth } from "@/lib/admin/auth";
import { ApiError } from "@/lib/admin/errors";
import { passwordStrength, useChangePassword, useSetup2fa } from "@/lib/admin/api/account";

function GateLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { logout } = useAuth();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-md sm:p-7">
          <h1 className="text-xl">{title}</h1>
          <p className="mt-1 mb-5 text-sm text-muted">{description}</p>
          {children}
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" leftIcon={<LogOut aria-hidden size={14} />} onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </main>
  );
}

function ChangeTemporaryPassword() {
  const { reloadUser } = useAuth();
  const toast = useToast();
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const strength = passwordStrength(next);

  const submit = async () => {
    setFormError(null);
    const e = validateNewPassword(current, next, confirm, strength);
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await change.mutateAsync({ current, new: next }); // guarda la sesión nueva: no se vuelve al login
      toast.success("Contraseña actualizada");
      await reloadUser(); // limpia mustChangePassword (y, si procede, pasa a la pantalla del 2FA)
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") setErrors({ current: "La contraseña temporal no es correcta." });
      else if (err instanceof ApiError && err.code === "PASSWORD_UNCHANGED") setErrors({ new: "La nueva contraseña debe ser distinta de la temporal." });
      else {
        setErrors(err instanceof ApiError && err.code === "VALIDATION_ERROR" ? err.fieldErrors() : {});
        setFormError(apiMessage(err));
      }
    }
  };

  return (
    <GateLayout title="Cambia tu contraseña temporal" description="Tu cuenta tiene una contraseña temporal. Elige una propia para poder usar el panel.">
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Contraseña temporal (actual)" type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <div>
          <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.new} hint="Mínimo 12 caracteres." />
          {next ? <PasswordStrengthMeter strength={strength} /> : null}
        </div>
        <Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button type="submit" variant="primary" size="lg" loading={change.isPending} leftIcon={<KeyRound aria-hidden size={16} />} className="w-full">
          Cambiar contraseña
        </Button>
      </form>
    </GateLayout>
  );
}

function ActivateTwoFactor() {
  const toast = useToast();
  const setup = useSetup2fa();
  const [uri, setUri] = useState<string | null>(null);

  const start = async () => {
    try {
      const res = await setup.mutateAsync();
      setUri(res.otpauthUrl);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  return (
    <GateLayout title="Activa la verificación en dos pasos" description="Las cuentas de propietario y administrador deben proteger el acceso con un código temporal además de la contraseña.">
      <div className="grid gap-4">
        <Notice tone="info">Necesitarás una app de autenticación (Google Authenticator, Authy, 1Password…). No podrás usar el panel hasta completar este paso.</Notice>
        <Button variant="primary" size="lg" leftIcon={<ShieldCheck aria-hidden size={16} />} onClick={start} loading={setup.isPending} className="w-full">
          Empezar
        </Button>
      </div>
      {uri ? <EnableDialog uri={uri} required onClose={() => setUri(null)} /> : null}
    </GateLayout>
  );
}

/** Pantalla que encierra a la cuenta hasta resolver mustChangePassword (primero) o twoFactorSetupRequired. */
export function SecurityGate() {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <ChangeTemporaryPassword />;
  return <ActivateTwoFactor />;
}
