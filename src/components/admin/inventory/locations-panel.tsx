"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, DataTable, Dialog, EmptyState, Input, Menu, Select, Switch, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { inventoryApi, useInvalidateInventory, useLocations, type Location } from "@/lib/admin/api/inventory";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/admin/format";

const CODE_MESSAGES: Record<string, string> = {
  CANNOT_DELETE_DEFAULT: "No puedes eliminar la ubicación principal.",
  CANNOT_DELETE_ACTIVE: "Desactiva la ubicación antes de eliminarla.",
  LOCATION_HAS_INVENTORY: "No se puede eliminar: tiene niveles de inventario registrados. Desactívala en su lugar.",
  LOCATION_HAS_RESERVED_STOCK: "No se puede desactivar: tiene stock reservado por pedidos pendientes.",
  CANNOT_DEACTIVATE_DEFAULT_WITH_STOCK: "No se puede desactivar la principal mientras tenga stock.",
  CANNOT_DEACTIVATE_ONLY_ACTIVE: "No se puede desactivar la única ubicación activa.",
  DEFAULT_LOCATION_REQUIRED: "Elige otra ubicación activa como principal para continuar.",
  INVALID_DEFAULT_LOCATION: "La ubicación principal debe estar activa.",
  DEFAULT_LOCATION_CONFLICT: "Otra persona cambió la ubicación principal. Inténtalo de nuevo.",
};

function locationError(e: unknown): string {
  return e instanceof ApiError && CODE_MESSAGES[e.code] ? CODE_MESSAGES[e.code] : errorMessage(e);
}

export function LocationsPanel() {
  const canWrite = useCan("inventory:write");
  const confirm = useConfirm();
  const toast = useToast();
  const invalidate = useInvalidateInventory();
  const q = useLocations();
  const [editing, setEditing] = useState<Location | "new" | null>(null);

  const locations = q.data ?? [];

  const remove = async (l: Location) => {
    const ok = await confirm({ title: `¿Eliminar «${l.name}»?`, description: "Solo se pueden eliminar ubicaciones inactivas, que no sean la principal y sin niveles de inventario.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await inventoryApi.deleteLocation(l.id);
      toast.success("Ubicación eliminada.");
      await invalidate();
    } catch (e) {
      toast.error(locationError(e));
    }
  };

  const columns: DataTableColumn<Location>[] = [
    { key: "name", header: "Nombre", cell: (l) => <span className="font-medium">{l.name}</span> },
    {
      key: "state",
      header: "Estado",
      cell: (l) => (
        <span className="flex flex-wrap gap-1.5">
          {l.isDefault ? <Badge tone="accent">Principal</Badge> : null}
          <Badge tone={l.isActive ? "success" : "neutral"} dot>
            {l.isActive ? "Activa" : "Inactiva"}
          </Badge>
        </span>
      ),
    },
    { key: "created", header: "Creada", hideOnMobile: true, cell: (l) => formatDate(l.createdAt) },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "56px",
      cell: (l) =>
        canWrite ? (
          <Menu
            label={`Acciones de ${l.name}`}
            items={[
              { label: "Editar", onSelect: () => setEditing(l) },
              { label: "Eliminar", danger: true, disabled: l.isDefault || l.isActive, onSelect: () => void remove(l) },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Dónde se guarda el stock. Siempre hay una ubicación principal activa.</p>
        {canWrite ? (
          <Button variant="primary" leftIcon={<Plus aria-hidden size={15} />} onClick={() => setEditing("new")}>
            Nueva ubicación
          </Button>
        ) : null}
      </div>
      <DataTable aria-label="Ubicaciones" columns={columns} rows={locations} getRowId={(l) => l.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty={<EmptyState title="Sin ubicaciones" description="Crea la primera para registrar stock." />} />
      {editing ? <LocationDialog key={editing === "new" ? "new" : editing.id} location={editing === "new" ? null : editing} all={locations} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function LocationDialog({ location, all, onClose }: { location: Location | null; all: Location[]; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateInventory();
  const [name, setName] = useState(location?.name ?? "");
  const [isActive, setIsActive] = useState(location?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(location?.isDefault ?? false);
  const [replacement, setReplacement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const losesDefault = !!location?.isDefault && (!isDefault || !isActive);
  const candidates = all.filter((l) => l.isActive && l.id !== location?.id);

  const submit = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setNameError("El nombre es obligatorio.");
    if (trimmed.length > 255) return setNameError("Máximo 255 caracteres.");
    setNameError(null);
    if (isDefault && !isActive) return setError("La ubicación principal debe estar activa.");
    if (losesDefault && !replacement) return setError("Elige qué otra ubicación activa será la principal.");
    setBusy(true);
    try {
      if (!location) {
        await inventoryApi.createLocation(trimmed);
      } else {
        await inventoryApi.updateLocation(location.id, {
          name: trimmed,
          isActive,
          isDefault,
          ...(losesDefault ? { replacementDefaultId: replacement } : {}),
        });
      }
      toast.success(location ? "Ubicación actualizada." : "Ubicación creada.");
      await invalidate();
      onClose();
    } catch (e) {
      setError(locationError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={location ? "Editar ubicación" : "Nueva ubicación"}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>
            {location ? "Guardar" : "Crear"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input data-autofocus="" label="Nombre" value={name} maxLength={255} error={nameError} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} />
        {location ? (
          <>
            <Switch checked={isActive} onChange={setIsActive} label="Activa" hint="Solo las ubicaciones activas reciben ajustes." />
            <Switch checked={isDefault} onChange={setIsDefault} label="Ubicación principal" />
            {losesDefault ? (
              <Select label="Nueva ubicación principal" value={replacement} onChange={(e) => setReplacement(e.target.value)} hint="Hace falta otra ubicación activa para reemplazarla.">
                <option value="">Elige…</option>
                {candidates.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            ) : null}
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
