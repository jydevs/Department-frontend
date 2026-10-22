"use client";

import { useState } from "react";
import { Pencil, Plus, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Badge, Button, DataTable, DateTime, EmptyState, IconButton, PageHeader, TabPanel, Tabs, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { ActionsHeader, Notice, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { useAuth } from "@/lib/admin/auth";
import { useCan } from "@/lib/admin/permissions";

import { useDeactivateStaff, useRoles, useStaff, useUpdateStaff, type CreatedStaff, type StaffMember } from "@/lib/admin/api/staff";
import { CreateStaffDialog, EditStaffDialog, PasswordRevealDialog, roleLabel } from "./staff-dialogs";
import { RolesView } from "./roles-view";

export function StaffPage() {
  return (
    <PermissionGate perm="staff:read">
      <StaffPageInner />
    </PermissionGate>
  );
}

function StaffPageInner() {
  const canWrite = useCan("staff:write");
  const canRoles = useCan("roles:read");
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("staff");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [revealed, setRevealed] = useState<CreatedStaff | null>(null);
  const staff = useStaff(page, pageSize);
  const roles = useRoles(canRoles);
  const deactivate = useDeactivateStaff();
  const update = useUpdateStaff();


  const actorIsOwner = user?.role === "owner";
  const roleById = new Map((roles.data ?? []).map((r) => [r.id, r]));
  const canManage = canWrite && canRoles;

  const toggleActive = async (m: StaffMember) => {
    if (m.isActive) {
      const ok = await confirm({ title: `Desactivar a ${m.fullName}`, description: "Perderá el acceso al panel y se cerrarán sus sesiones. Podrás reactivarla después.", confirmLabel: "Desactivar", tone: "danger" });
      if (!ok) return;
      try {
        await deactivate.mutateAsync(m.id);
        toast.success(`${m.fullName} desactivado`);
      } catch (e) {
        toast.error(apiMessage(e));
      }
    } else {
      try {
        await update.mutateAsync({ id: m.id, patch: { isActive: true } });
        toast.success(`${m.fullName} reactivado`);
      } catch (e) {
        toast.error(apiMessage(e));
      }
    }
  };

  const columns: DataTableColumn<StaffMember>[] = [
    {
      key: "name",
      header: "Persona",
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {m.fullName} {m.id === user?.id ? <Badge tone="info">Tú</Badge> : null}
          </p>
          <p className="truncate text-xs text-muted">{m.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Rol", cell: (m) => (roleById.get(m.roleId) ? <Badge tone="accent">{roleLabel(roleById.get(m.roleId)!)}</Badge> : <span className="text-muted">—</span>) },
    { key: "2fa", header: "2FA", hideOnMobile: true, cell: (m) => (m.totpEnabled ? <Badge tone="success">Activado</Badge> : <Badge>No</Badge>) },
    { key: "state", header: "Estado", cell: (m) => (m.isActive ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="danger" dot>Desactivado</Badge>) },
    { key: "last", header: "Último acceso", hideOnMobile: true, cell: (m) => <DateTime value={m.lastLoginAt} mode="relative" /> },
    ...(canManage
      ? [
          {
            key: "actions",
            header: <ActionsHeader />,
            align: "right" as const,
            cell: (m: StaffMember) => {
              const targetOwner = roleById.get(m.roleId)?.key === "owner";
              const locked = targetOwner && !actorIsOwner;
              const self = m.id === user?.id;
              return (
                <div className="flex items-center justify-end gap-1">
                  <IconButton size="sm" label={`Editar a ${m.fullName}`} icon={<Pencil aria-hidden size={15} />} disabled={locked} onClick={() => setEditing(m)} />
                  {m.isActive ? (
                    <IconButton size="sm" variant="danger" label={`Desactivar a ${m.fullName}`} icon={<UserX aria-hidden size={15} />} disabled={locked || self} onClick={() => void toggleActive(m)} />
                  ) : (
                    <IconButton size="sm" label={`Reactivar a ${m.fullName}`} icon={<UserCheck aria-hidden size={15} />} disabled={locked} onClick={() => void toggleActive(m)} />
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const data = staff.data;
  return (
    <>
      <PageHeader
        title="Personal y roles"
        description="Quién puede entrar al panel y qué puede hacer."
        actions={
          tab === "staff" && canManage ? (
            <Button variant="primary" leftIcon={<Plus aria-hidden size={15} />} onClick={() => setCreating(true)}>
              Nuevo miembro
            </Button>
          ) : undefined
        }
      />
      <Tabs
        base="staff"
        aria-label="Secciones"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "staff", label: "Personal", count: data?.total },
          ...(canRoles ? [{ key: "roles", label: "Roles y permisos", count: roles.data?.length }] : []),
        ]}
      />
      <TabPanel base="staff" tabKey="staff" active={tab === "staff"}>
        {canWrite && !canRoles ? (
          <Notice className="mb-4" tone="warning">Para crear o editar personal también necesitas el permiso <code>roles:read</code>.</Notice>
        ) : null}
        <DataTable
          aria-label="Personal"
          columns={columns}
          rows={data?.items ?? []}
          getRowId={(m) => m.id}
          loading={staff.isFetching}
          error={staff.isError ? staff.error : undefined}
          onRetry={() => staff.refetch()}
          empty={<EmptyState icon={<ShieldCheck aria-hidden size={22} />} title="No hay personal" />}
          pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
        />
      </TabPanel>
      <TabPanel base="staff" tabKey="roles" active={tab === "roles"}>
        <RolesView roles={roles.data} loading={roles.isPending} error={roles.error} onRetry={() => roles.refetch()} />
      </TabPanel>
      {creating && roles.data ? (
        <CreateStaffDialog
          roles={roles.data}
          actorIsOwner={actorIsOwner}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setRevealed(c);
          }}
        />
      ) : null}
      {editing && roles.data ? <EditStaffDialog key={editing.id} member={editing} roles={roles.data} actorId={user?.id ?? ""} actorIsOwner={actorIsOwner} onClose={() => setEditing(null)} /> : null}
      {revealed ? <PasswordRevealDialog created={revealed} onClose={() => setRevealed(null)} /> : null}
    </>
  );
}
