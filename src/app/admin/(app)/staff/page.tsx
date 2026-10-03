"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, Card, CopyButton, DateTime, PageHeader, Skeleton, Tabs } from "@/components/admin/ui/Display";
import { Input, Select, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { PERMISSION_ORDER, ROLE_INFO, useRoles, useSaveStaff, useSetStaffActive, useStaff } from "@/lib/admin/api/admin";
import { useAuth } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/admin/errors";
import { Can, useCan } from "@/lib/admin/permissions";
import type { Staff } from "@/lib/admin/types";

function Matrix({ roles }: { roles: { key: string; name: string; permissions: string[] }[] }) {
  const perms = [...PERMISSION_ORDER, ...roles.flatMap((r) => r.permissions).filter((p) => !PERMISSION_ORDER.includes(p))].filter((p, i, a) => a.indexOf(p) === i);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">{roles.map((r) => <Card key={r.key} title={r.name}><p className="text-xs text-muted">{ROLE_INFO[r.key] ?? "Rol personalizado"} · {r.permissions.length} permisos · solo lectura</p></Card>)}</div>
      <div className="overflow-x-auto rounded-sm border border-line bg-surface">
        <table className="w-full text-left text-sm"><caption className="sr-only">Matriz de permisos por rol</caption>
          <thead className="adm-label border-b border-line bg-surface2/50 !text-[10px]"><tr><th scope="col" className="px-3 py-3 font-normal">Permiso</th>{roles.map((r) => <th key={r.key} scope="col" className="px-3 py-3 text-center font-normal">{r.name}</th>)}</tr></thead>
          <tbody>{perms.map((p) => <tr key={p} className="border-b border-line last:border-0"><th scope="row" className="px-3 py-2 font-mono text-xs font-normal">{p}</th>{roles.map((r) => <td key={r.key} className="px-3 py-2 text-center">{r.permissions.includes(p) ? <span aria-label="Permitido" className="text-ok">●</span> : <span aria-label="No permitido" className="text-muted">–</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const { user } = useAuth();
  const canRoles = useCan("roles:read");
  const staff = useStaff(), roles = useRoles(canRoles);
  const save = useSaveStaff(), setActive = useSetStaffActive(), confirm = useConfirm();
  const can = useCan("staff:write");
  const [edit, setEdit] = useState<(Staff & { isNew?: boolean }) | null>(null), [err, setErr] = useState(""), [pass, setPass] = useState<string | null>(null);
  const roleName = (id: string) => roles.data?.find((r) => r.id === id)?.name ?? "—";
  const assignable = roles.data?.filter((r) => r.key !== "owner" || user?.role === "owner") ?? [];
  const blank = (): Staff & { isNew: boolean } => ({ id: "", name: "", email: "", roleId: roles.data?.find((r) => r.key === "support")?.id ?? "", active: true, twoFactor: false, lastLogin: null, isNew: true });
  return (
    <>
      <PageHeader title="Personal y roles" actions={<Can perm="staff:write"><Button variant="primary" icon={<Plus className="size-4" />} disabled={!roles.data} onClick={() => { setErr(""); setEdit(blank()); }}>Invitar persona</Button></Can>} />
      {canRoles && <Tabs tabs={[{ key: "staff", label: "Personal" }, { key: "roles", label: "Roles y permisos" }]} value={tab} onChange={setTab} />}
      <div className="mt-4">
        {tab === "staff" || !canRoles ? <DataTable caption="Personal" loading={staff.isLoading} rows={staff.data} rowKey={(s) => s.id} error={staff.error ? errorMessage(staff.error) : undefined} onRowClick={can ? (s) => { setErr(""); setEdit(s); } : undefined}
          columns={[{ key: "n", header: "Persona", cell: (s) => <div><p className="font-medium">{s.name}{s.id === user?.id && <span className="ml-1 text-xs text-muted">(tú)</span>}</p><p className="text-xs text-muted">{s.email}</p></div> }, { key: "r", header: "Rol", cell: (s) => <Badge tone="info">{roleName(s.roleId)}</Badge> }, { key: "a", header: "Estado", cell: (s) => <Badge tone={s.active ? "ok" : "neutral"}>{s.active ? "Activo" : "Inactivo"}</Badge> }, { key: "t", header: "2FA", cell: (s) => (s.twoFactor ? "Sí" : "No") }, { key: "l", header: "Último acceso", cell: (s) => (s.lastLogin ? <DateTime value={s.lastLogin} /> : "Nunca") },
            { key: "x", header: "", align: "right", cell: (s) => can && s.id !== user?.id ? <span onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={async () => { if (s.active) { if (await confirm({ title: "Desactivar persona", message: `${s.name} perderá el acceso y se cerrarán sus sesiones.`, danger: true, confirmLabel: "Desactivar" })) setActive.mutate({ id: s.id, active: false }); } else setActive.mutate({ id: s.id, active: true }); }}>{s.active ? "Desactivar" : "Activar"}</Button></span> : null }]} />
          : roles.isLoading ? <Skeleton className="h-64" /> : roles.error ? <p role="alert" className="text-sm text-accent-text">{errorMessage(roles.error)}</p> : <Matrix roles={roles.data ?? []} />}
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? "Invitar persona" : "Editar persona"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate({ id: edit.isNew ? undefined : edit.id, name: edit.name, email: edit.email, roleId: edit.roleId, active: edit.active }, { onSuccess: (r) => { setEdit(null); if (r.tempPassword) setPass(r.tempPassword); }, onError: (e) => setErr(errorMessage(e)) })}>Guardar</Button></>}>
        {edit && <div className="space-y-3"><Input label="Nombre" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label="Correo" type="email" value={edit.email} disabled={!edit.isNew} hint={edit.isNew ? "Se generará una contraseña temporal." : "El correo no se puede cambiar."} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          <Select label="Rol" value={edit.roleId} disabled={edit.id === user?.id} onChange={(e) => setEdit({ ...edit, roleId: e.target.value })}>{(roles.data?.some((r) => r.id === edit.roleId && !assignable.includes(r)) ? roles.data : assignable).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
          {!edit.isNew && <label className="flex items-center justify-between text-sm">Activo<Switch label="Activo" checked={edit.active} disabled={edit.id === user?.id} onChange={(v) => setEdit({ ...edit, active: v })} /></label>}{err && <p role="alert" className="text-sm text-accent-text">{err}</p>}</div>}
      </Dialog>
      <Dialog open={!!pass} onClose={() => setPass(null)} title="Contraseña temporal" size="sm" footer={<Button variant="primary" onClick={() => setPass(null)}>Ya la copié</Button>}>
        <p className="mb-2 text-sm text-muted">Compártela de forma segura. <b>Solo se muestra esta vez</b>; la persona debería cambiarla al entrar (Mi cuenta).</p>
        <div className="flex items-center justify-between rounded-sm bg-surface2 p-3 font-mono text-sm"><span>{pass}</span>{pass && <CopyButton text={pass} label="Copiar contraseña" />}</div>
      </Dialog>
    </>
  );
}
