"use client";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, Card, CopyButton, DateTime, PageHeader, Tabs } from "@/components/ui/Display";
import { Input, Select, Switch } from "@/components/ui/Form";
import { Dialog, useConfirm } from "@/components/ui/Overlay";
import { useDeleteStaff, useResetStaffPassword, useRoles, useSaveStaff, useStaff } from "@/lib/api/admin";
import { Can, useCan } from "@/lib/permissions";
import type { Staff } from "@/lib/types";

export default function StaffPage() {
  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const staff = useStaff(), roles = useRoles();
  const save = useSaveStaff(), del = useDeleteStaff(), reset = useResetStaffPassword(), confirm = useConfirm();
  const can = useCan("staff:write");
  const [edit, setEdit] = useState<Staff | null>(null), [err, setErr] = useState(""), [pass, setPass] = useState<string | null>(null);
  const roleName = (k: string) => roles.data?.find((r) => r.key === k)?.name ?? k;
  return (
    <>
      <PageHeader title="Personal y roles" actions={<Can perm="staff:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setErr(""); setEdit({ id: "", name: "", email: "", role: "support", active: true, twoFactor: false, lastLogin: null }); }}>Invitar persona</Button></Can>} />
      <Tabs tabs={[{ key: "staff", label: "Personal" }, { key: "roles", label: "Roles y permisos" }]} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "staff" ? <DataTable caption="Personal" loading={staff.isLoading} rows={staff.data} rowKey={(s) => s.id} onRowClick={can ? (s) => { setErr(""); setEdit(s); } : undefined}
          columns={[{ key: "n", header: "Persona", sortValue: (s) => s.name, cell: (s) => <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted">{s.email}</p></div> }, { key: "r", header: "Rol", cell: (s) => <Badge tone="info">{roleName(s.role)}</Badge> }, { key: "a", header: "Estado", cell: (s) => <Badge tone={s.active ? "ok" : "neutral"}>{s.active ? "Activo" : "Inactivo"}</Badge> }, { key: "t", header: "2FA", cell: (s) => (s.twoFactor ? "Sí" : "No") }, { key: "l", header: "Último acceso", cell: (s) => (s.lastLogin ? <DateTime value={s.lastLogin} /> : "Nunca") },
            { key: "x", header: "", align: "right", cell: (s) => can && s.role !== "owner" ? <span onClick={(e) => e.stopPropagation()}><IconButton label={`Restablecer contraseña de ${s.name}`} onClick={() => reset.mutate(s.id, { onSuccess: (r) => setPass(r.tempPassword) })}><KeyRound className="size-4" /></IconButton><IconButton label={`Eliminar ${s.name}`} onClick={async () => { if (await confirm({ title: "Eliminar persona", message: `${s.name} perderá el acceso.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(s.id); }}><Trash2 className="size-4" /></IconButton></span> : null }]} />
          : <div className="grid gap-3 md:grid-cols-2">{roles.data?.map((r) => <Card key={r.key} title={r.name}><p className="mb-2 text-xs text-muted">{r.description} · solo lectura</p><ul className="flex flex-wrap gap-1">{r.permissions.map((p) => <li key={p}><Badge>{p}</Badge></li>)}</ul></Card>)}</div>}
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar persona" : "Invitar persona"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: (r) => { setEdit(null); if (r.tempPassword) setPass(r.tempPassword); }, onError: (e) => setErr(e.message) })}>Guardar</Button></>}>
        {edit && <div className="space-y-3"><Input label="Nombre" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label="Correo" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          <Select label="Rol" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{roles.data?.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</Select>
          <label className="flex items-center justify-between text-sm">Activo<Switch label="Activo" checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /></label>{err && <p role="alert" className="text-sm text-red-500">{err}</p>}</div>}
      </Dialog>
      <Dialog open={!!pass} onClose={() => setPass(null)} title="Contraseña temporal" size="sm" footer={<Button variant="primary" onClick={() => setPass(null)}>Ya la copié</Button>}>
        <p className="mb-2 text-sm text-muted">Compártela de forma segura. <b>Solo se muestra esta vez</b>; la persona deberá cambiarla al entrar.</p>
        <div className="flex items-center justify-between rounded-lg bg-surface2 p-3 font-mono text-sm"><span>{pass}</span>{pass && <CopyButton text={pass} label="Copiar contraseña" />}</div>
      </Dialog>
    </>
  );
}
