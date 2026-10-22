"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { Badge, Button, Card, Switch, EmptyState, ErrorState, IconButton, Money, PageHeader, Skeleton, TabPanel, Tabs, useConfirm, useToast } from "@/components/admin/ui";
import { ActionsHeader, PermissionGate } from "@/components/admin/settings/shared";
import { useCan } from "@/lib/admin/permissions";
import { formatCop } from "@/lib/admin/format";
import { Notice, daysLabel, norm, shippingError } from "./shared";
import { useDeleteRate, useDeleteZone, useUpdateRate, useUpdateZone, useZones, type ShippingRate, type ShippingZone } from "@/lib/admin/api/shipping";
import { ZoneDialog } from "./zone-dialog";
import { RateDialog } from "./rate-dialog";
import { TaxSettingsCard } from "./tax-settings";


function days(r: ShippingRate): string {
  return daysLabel(r.minDays, r.maxDays) ?? "—";
}

function ZoneCard({ zone, canWrite, onEdit, onAddRate, onEditRate }: { zone: ShippingZone; canWrite: boolean; onEdit: () => void; onAddRate: () => void; onEditRate: (r: ShippingRate) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const delZone = useDeleteZone();
  const delRate = useDeleteRate();
  const updRate = useUpdateRate();
  const updZone = useUpdateZone();
  const all = zone.departments.includes("*");

  const removeZone = async () => {
    if (!(await confirm({ title: `Eliminar la zona «${zone.name}»`, description: zone.rates.length > 0 ? `Se eliminarán también sus ${zone.rates.length} tarifa(s). No se puede deshacer.` : "No se puede deshacer.", confirmLabel: "Eliminar", tone: "danger" }))) return;
    try {
      await delZone.mutateAsync(zone.id);
      toast.success("Zona eliminada");
    } catch (e) {
      toast.error(shippingError(e));
    }
  };
  const removeRate = async (r: ShippingRate) => {
    if (!(await confirm({ title: `Eliminar la tarifa «${r.name}»`, confirmLabel: "Eliminar", tone: "danger" }))) return;
    try {
      await delRate.mutateAsync(r.id);
      toast.success("Tarifa eliminada");
    } catch (e) {
      toast.error(shippingError(e));
    }
  };
  const toggleRate = async (r: ShippingRate) => {
    try {
      await updRate.mutateAsync({ id: r.id, patch: { isActive: !r.isActive } });
    } catch (e) {
      toast.error(shippingError(e));
    }
  };
  const toggleZone = async () => {
    try {
      await updZone.mutateAsync({ id: zone.id, patch: { isActive: !zone.isActive } });
    } catch (e) {
      toast.error(shippingError(e));
    }
  };

  const rates = [...zone.rates].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"));

  const warnings: { tone: "warning" | "info"; text: string }[] = [];
  if (!zone.isActive) warnings.push({ tone: "warning", text: "Zona inactiva: no se ofrece en el checkout, aunque tenga tarifas activas." });
  else if (!rates.some((r) => r.isActive)) warnings.push({ tone: "warning", text: "Esta zona no tiene tarifas activas: los compradores de estos departamentos no verán ninguna opción de envío de aquí." });
  if (all && zone.isActive) warnings.push({ tone: "info", text: "«Todo el país» es la zona general: si otra zona activa nombra el departamento del comprador, gana esa zona y esta no se ofrece." });

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {zone.name}
          {zone.isActive ? <Badge tone="success" dot>Activa</Badge> : <Badge dot>Inactiva</Badge>}
        </span>
      }
      description={all ? "Todo el país" : `${zone.departments.length} departamento(s)`}
      actions={
        canWrite ? (
          <>
            <Switch checked={zone.isActive} onChange={toggleZone} disabled={updZone.isPending} aria-label={`${zone.isActive ? "Desactivar" : "Activar"} zona ${zone.name}`} />
            <IconButton label={`Editar zona ${zone.name}`} variant="secondary" size="sm" icon={<Pencil aria-hidden size={14} />} onClick={onEdit} />
            <IconButton label={`Eliminar zona ${zone.name}`} variant="danger" size="sm" icon={<Trash2 aria-hidden size={14} />} onClick={removeZone} loading={delZone.isPending} />
          </>
        ) : undefined
      }
    >
      {warnings.length > 0 ? (
        <div className="mb-4 space-y-2">
          {warnings.map((w) => (
            <Notice key={w.text} tone={w.tone}>{w.text}</Notice>
          ))}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Departamentos de la zona">
        {all ? <Badge tone="info">Todo el país</Badge> : zone.departments.map((d) => <Badge key={d}>{d}</Badge>)}
      </div>
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <table className="w-full min-w-[560px] border-collapse text-sm" aria-label={`Tarifas de ${zone.name}`}>
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="px-3 py-2">Tarifa</th>
              <th scope="col" className="px-3 py-2 text-right">Precio</th>
              <th scope="col" className="px-3 py-2 text-right">Gratis desde</th>
              <th scope="col" className="px-3 py-2">Plazo</th>
              <th scope="col" className="px-3 py-2 text-right">Orden</th>
              <th scope="col" className="px-3 py-2">Estado</th>
              {canWrite ? <th scope="col" className="px-3 py-2"><ActionsHeader /></th> : null}
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 7 : 6} className="px-3 py-6 text-center text-muted">
                  Esta zona aún no tiene tarifas: sin ellas los clientes no podrán elegir envío aquí.
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-medium">{r.name}</td>
                  <td className="px-3 py-2.5 text-right"><Money value={r.price} /></td>
                  <td className="px-3 py-2.5 text-right">{r.freeOverSubtotal !== null ? <Money value={r.freeOverSubtotal} /> : <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5">{days(r)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.position}</td>
                  <td className="px-3 py-2.5">
                    {canWrite ? (
                      <div className="flex items-center gap-2">
                        <Switch checked={r.isActive} onChange={() => toggleRate(r)} disabled={updRate.isPending} aria-label={`${r.isActive ? "Desactivar" : "Activar"} tarifa ${r.name}`} />
                        <Badge tone={r.isActive ? "success" : "neutral"} dot>{r.isActive ? "Activa" : "Inactiva"}</Badge>
                      </div>
                    ) : (
                      <Badge tone={r.isActive ? "success" : "neutral"} dot>{r.isActive ? "Activa" : "Inactiva"}</Badge>
                    )}
                  </td>
                  {canWrite ? (
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Editar tarifa ${r.name}`} size="sm" icon={<Pencil aria-hidden size={14} />} onClick={() => onEditRate(r)} />
                        <IconButton label={`Eliminar tarifa ${r.name}`} size="sm" variant="danger" icon={<Trash2 aria-hidden size={14} />} onClick={() => removeRate(r)} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {rates.length === 0 ? (
          <p className="rounded-md border border-border px-3 py-5 text-center text-sm text-muted">Esta zona aún no tiene tarifas: sin ellas los clientes no podrán elegir envío aquí.</p>
        ) : (
          <ul className="space-y-2" aria-label={`Tarifas de ${zone.name}`}>
            {rates.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium break-words">{r.name}</p>
                  <p className="shrink-0 font-medium"><Money value={r.price} /></p>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {[days(r) !== "—" ? days(r) : null, r.freeOverSubtotal !== null ? `gratis desde ${formatCop(r.freeOverSubtotal)}` : null, `orden ${r.position}`].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {canWrite ? <Switch checked={r.isActive} onChange={() => toggleRate(r)} disabled={updRate.isPending} aria-label={`${r.isActive ? "Desactivar" : "Activar"} tarifa ${r.name}`} /> : null}
                    <Badge tone={r.isActive ? "success" : "neutral"} dot>{r.isActive ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  {canWrite ? (
                    <div className="flex gap-1">
                      <IconButton label={`Editar tarifa ${r.name}`} size="sm" icon={<Pencil aria-hidden size={14} />} onClick={() => onEditRate(r)} />
                      <IconButton label={`Eliminar tarifa ${r.name}`} size="sm" variant="danger" icon={<Trash2 aria-hidden size={14} />} onClick={() => removeRate(r)} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canWrite ? (
        <div className="mt-3">
          <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} onClick={onAddRate}>
            Añadir tarifa
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function ShippingPage() {
  return (
    <PermissionGate perm="shipping:read">
      <ShippingPageInner />
    </PermissionGate>
  );
}

function ShippingPageInner() {
  const canWrite = useCan("shipping:write");
  const [tab, setTab] = useState("zones");
  const [zoneDialog, setZoneDialog] = useState<ShippingZone | "new" | null>(null);
  const [rateDialog, setRateDialog] = useState<{ zone: ShippingZone; rate: ShippingRate | null } | null>(null);
  const query = useZones();

  const taken = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of query.data ?? []) for (const d of z.departments) if (d !== "*" && !m.has(norm(d))) m.set(norm(d), z.name);
    return m;
  }, [query.data]);


  // los diálogos guardan el id para mostrar siempre la versión fresca de la zona
  const zoneById = (id: string) => query.data?.find((z) => z.id === id);

  return (
    <>
      <PageHeader
        title="Envíos e impuestos"
        description="Zonas de envío, tarifas por zona y configuración del IVA."
        actions={
          tab === "zones" && canWrite ? (
            <Button variant="primary" leftIcon={<Plus aria-hidden size={15} />} onClick={() => setZoneDialog("new")}>
              Nueva zona
            </Button>
          ) : undefined
        }
      />
      <Tabs
        base="shipping"
        aria-label="Secciones"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "zones", label: "Zonas y tarifas", count: query.data?.length },
          { key: "taxes", label: "Impuestos" },
        ]}
      />
      <TabPanel base="shipping" tabKey="zones" active={tab === "zones"}>
        {query.isPending ? (
          <div className="space-y-4" aria-busy>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface">
            <EmptyState
              icon={<Truck aria-hidden size={22} />}
              title="Aún no hay zonas de envío"
              description="Una zona agrupa departamentos que comparten tarifas: por ejemplo «Bogotá D.C.» con un envío de $8.000 y «Resto del país» (Todo el país) con un envío nacional de $15.000. Cada zona necesita al menos una tarifa activa para aparecer en el checkout. Si una zona nombra el departamento del comprador, gana sobre «Todo el país»."
              action={canWrite ? <Button variant="primary" leftIcon={<Plus aria-hidden size={15} />} onClick={() => setZoneDialog("new")}>Crear zona</Button> : <p className="text-sm text-muted">Pide a un administrador que cree las zonas.</p>}
            />
          </div>
        ) : (
          <div className="space-y-5">
            {query.data.map((z) => (
              <ZoneCard key={z.id} zone={z} canWrite={canWrite} onEdit={() => setZoneDialog(z)} onAddRate={() => setRateDialog({ zone: z, rate: null })} onEditRate={(r) => setRateDialog({ zone: z, rate: r })} />
            ))}
          </div>
        )}
      </TabPanel>
      <TabPanel base="shipping" tabKey="taxes" active={tab === "taxes"}>
        <TaxSettingsCard />
      </TabPanel>
      {zoneDialog ? <ZoneDialog key={zoneDialog === "new" ? "new" : zoneDialog.id} zone={zoneDialog === "new" ? null : (zoneById(zoneDialog.id) ?? zoneDialog)} takenDepartments={taken} onClose={() => setZoneDialog(null)} /> : null}
      {rateDialog ? <RateDialog key={`${rateDialog.zone.id}-${rateDialog.rate?.id ?? "new"}`} zone={zoneById(rateDialog.zone.id) ?? rateDialog.zone} rate={rateDialog.rate} onClose={() => setRateDialog(null)} /> : null}
    </>
  );
}
