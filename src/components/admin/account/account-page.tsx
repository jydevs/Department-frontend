"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, PageHeader, Skeleton, useToast } from "@/components/admin/ui";
import { Notice, ROLE_LABELS, ACTION_LABELS, groupPermissions, apiMessage } from "@/components/admin/settings/shared";
import { useAuth } from "@/lib/admin/auth";
import { ApiError } from "@/lib/admin/errors";
import { passwordStrength, useChangePassword } from "@/lib/admin/api/account";
import { PasswordStrengthMeter, validateNewPassword } from "./password-strength";
import { TwoFactorCard } from "./two-factor-card";

function ProfileCard() {
  const { user } = useAuth();
  if (!user) return <Skeleton className="h-40 w-full" />;
  const groups = groupPermissions(user.permissions);
  return (
    <Card title="Perfil" description="Datos de tu cuenta de personal.">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
        <dt className="text-muted">Nombre</dt>
        <dd>{user.fullName}</dd>
        <dt className="text-muted">Correo</dt>
        <dd>{user.email}</dd>
        <dt className="text-muted">Rol</dt>
        <dd><Badge tone="accent">{ROLE_LABELS[user.role] ?? user.role}</Badge></dd>
      </dl>
      <details className="mt-4 rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Mis permisos ({user.permissions.length})</summary>
        <dl className="space-y-2 border-t border-border p-3">
          {groups.map((g) => (
            <div key={g.resource} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="w-40 shrink-0 text-sm">{g.label}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {g.actions.map((a) => (
                  <Badge key={a} tone={a === "write" || a === "publish" || a === "payments" || a === "refunds" ? "warning" : "neutral"}>{ACTION_LABELS[a] ?? a}</Badge>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </Card>
  );
}

function PasswordCard() {
  const { logout } = useAuth();
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
      await change.mutateAsync({ current, new: next });
      toast.success("Contraseña cambiada. Inicia sesión de nuevo.");
      await logout(); // el servidor revoca todas las sesiones
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") setErrors({ current: "La contraseña actual no es correcta." });
      else {
        setErrors(err instanceof ApiError && err.code === "VALIDATION_ERROR" ? err.fieldErrors() : {});
        setFormError(apiMessage(err));
      }
    }
  };

  return (
    <Card title="Cambiar contraseña" description="Al cambiarla se cerrarán todas tus sesiones y tendrás que volver a entrar.">
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Contraseña actual" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <div>
          <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.new} hint="Mínimo 12 caracteres." />
          {next ? <PasswordStrengthMeter strength={strength} /> : null}
        </div>
        <Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <div>
          <Button type="submit" variant="primary" loading={change.isPending}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AccountPage() {
  return (
    <>
      <PageHeader title="Mi cuenta" description="Tu perfil, contraseña y verificación en dos pasos." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <ProfileCard />
          <TwoFactorCard />
        </div>
        <PasswordCard />
      </div>
    </>
  );
}
