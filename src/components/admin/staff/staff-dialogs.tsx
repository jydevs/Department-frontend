"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button, Checkbox, CopyButton, Dialog, Input, Select, Switch, useToast } from "@/components/admin/ui";
import { Notice, ROLE_LABELS, fieldErrorsOf, formErrorOf, apiMessage } from "@/components/admin/settings/shared";

import { useCreateStaff, useUpdateStaff, type CreatedStaff, type Role, type StaffMember } from "@/lib/admin/api/staff";

export function roleLabel(r: Pick<Role, "key" | "name">): string {
  return ROLE_LABELS[r.key] ?? r.name;
}

interface Common {
  roles: Role[];
  actorId: string;
  actorIsOwner: boolean;
  onClose: () => void;
}

export function CreateStaffDialog({ roles, actorIsOwner, onClose, onCreated }: Omit<Common, "actorId"> & { onCreated: (s: CreatedStaff) => void }) {
  const toast = useToast();
  const create = useCreateStaff();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Escribe un correo válido.";
    if (!fullName.trim()) e.fullName = "Obligatorio.";
    if (!roleId) e.roleId = "Elige un rol.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const created = await create.mutateAsync({ email: email.trim().toLowerCase(), fullName: fullName.trim(), roleId });
      toast.success("Miembro creado");
      onCreated(created);
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(formErrorOf(err));
      toast.error(apiMessage(err));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!create.isPending}
      title="Nuevo miembro del equipo"
      description="Se generará una contraseña temporal que verás una sola vez."
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={create.isPending}>
            Crear miembro
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required autoComplete="off" data-autofocus="" />
        <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} maxLength={255} required />
        <Select
          label="Rol"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          error={errors.roleId}
          required
          options={[{ value: "", label: "Elige un rol…" }, ...roles.map((r) => ({ value: r.id, label: roleLabel(r), disabled: r.key === "owner" && !actorIsOwner }))]}
          hint={!actorIsOwner ? "Solo un propietario puede asignar el rol Propietario." : undefined}
        />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Crear
        </button>
      </form>
    </Dialog>
  );
}

export function EditStaffDialog({ member, roles, actorId, actorIsOwner, onClose }: Common & { member: StaffMember }) {
  const toast = useToast();
  const update = useUpdateStaff();
  const [fullName, setFullName] = useState(member.fullName);
  const [roleId, setRoleId] = useState(member.roleId);
  const [isActive, setIsActive] = useState(member.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const isSelf = member.id === actorId;
  const targetRole = roles.find((r) => r.id === member.roleId);
  const lockedByOwner = targetRole?.key === "owner" && !actorIsOwner;

  const submit = async () => {
    setFormError(null);
    if (!fullName.trim()) return setErrors({ fullName: "Obligatorio." });
    setErrors({});
    const patch: { fullName?: string; roleId?: string; isActive?: boolean } = {};
    if (fullName.trim() !== member.fullName) patch.fullName = fullName.trim();
    if (roleId !== member.roleId) patch.roleId = roleId;
    if (isActive !== member.isActive) patch.isActive = isActive;
    if (Object.keys(patch).length === 0) return onClose();
    try {
      await update.mutateAsync({ id: member.id, patch });
      toast.success("Miembro actualizado");
      onClose();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(formErrorOf(err));
      toast.error(apiMessage(err));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!update.isPending}
      title={`Editar a ${member.fullName}`}
      description={member.email}
      footer={
        <>
          <Button onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={update.isPending} disabled={lockedByOwner}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {lockedByOwner ? <Notice tone="warning">Solo un propietario puede modificar a otro propietario.</Notice> : null}
        <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} maxLength={255} disabled={lockedByOwner} data-autofocus="" />
        <Select
          label="Rol"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          disabled={isSelf || lockedByOwner}
          hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}
          options={roles.map((r) => ({ value: r.id, label: roleLabel(r), disabled: r.key === "owner" && !actorIsOwner && r.id !== member.roleId }))}
        />
        <Switch checked={isActive} onChange={setIsActive} disabled={isSelf || lockedByOwner} label="Cuenta activa" hint={isSelf ? "No puedes desactivarte a ti mismo." : "Al desactivarla se cierran sus sesiones."} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
      </div>
    </Dialog>
  );
}

export function PasswordRevealDialog({ created, onClose }: { created: CreatedStaff; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={false}
      title="Contraseña temporal"
      description={`Comparte estos datos con ${created.fullName}.`}
      footer={
        <Button variant="primary" disabled={!saved} onClick={onClose}>
          Listo
        </Button>
      }
    >
      <div className="space-y-4">
        <Notice tone="warning" title="Se muestra una sola vez">
          Esta contraseña no se podrá volver a ver. Cópiala ahora y entrégala por un canal seguro; la persona debería cambiarla al entrar.
        </Notice>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Correo</dt>
            <dd>{created.email}</dd>
          </div>
        </dl>
        <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 p-3">
          <KeyRound aria-hidden size={16} className="shrink-0 text-muted" />
          <code data-testid="temp-password" className="min-w-0 flex-1 font-mono text-sm break-all select-all">
            {created.password}
          </code>
          <CopyButton value={created.password} label="Copiar" />
        </div>
        <Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} label="Ya copié la contraseña" />
      </div>
    </Dialog>
  );
}
