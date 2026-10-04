"use client";
import { History, MapPin, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, Card, DateTime, EmptyState, PageHeader, Skeleton, Tabs } from "@/components/admin/ui/Display";
import { Checkbox, Input, SearchInput, Select, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { ADJUST_REASONS, LOW_STOCK_THRESHOLD, useAdjustStock, useAdjustments, useDeleteLocation, useLevels, useLocations, useSaveLocation, useStaffNames, type Location, type StockLevel } from "@/lib/admin/api/catalog";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";

export default function InventoryPage() {
  const [tab, setTab] = useState<"levels" | "history" | "locations">("levels");
  const [q, setQ] = useState(""), [loc, setLoc] = useState(""), [low, setLow] = useState(false), [page, setPage] = useState(1);
  const onSearch = useCallback((v: string) => { setQ(v); setPage(1); }, []);
  const levels = useLevels({ q, locationId: loc, lowStock: low, page }), locsQ = useLocations(), locs = locsQ.data ?? [];
  const can = useCan("inventory:write");
  const adjust = useAdjustStock();
  const [target, setTarget] = useState<StockLevel | null>(null);
  const [mode, setMode] = useState<"delta" | "setTo">("delta"), [qty, setQty] = useState(0), [reason, setReason] = useState("received"), [note, setNote] = useState("");
  const open = (r: StockLevel) => { setTarget(r); setMode("delta"); setQty(0); setReason("received"); setNote(""); };
  const result = target ? (mode === "delta" ? target.onHand + qty : qty) : 0;
  const invalid = !target || !Number.isInteger(qty) || (mode === "delta" ? qty === 0 || result < 0 : qty < 0 || qty === target.onHand) || (!!target && result < target.reserved);
  const apply = () => target && adjust.mutate({ variantId: target.variantId, locationId: target.locationId, reason, note, ...(mode === "delta" ? { delta: qty } : { setTo: qty }) }, { onSuccess: () => setTarget(null) });
  return (
    <>
      <PageHeader title="Inventario" />
      <Tabs tabs={[{ key: "levels", label: "Niveles" }, { key: "history", label: "Historial" }, { key: "locations", label: "Ubicaciones" }]} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "levels" && <>
          <div className="mb-3 grid items-center gap-2 sm:grid-cols-[2fr_1fr_auto]"><SearchInput onSearch={onSearch} placeholder="Producto o SKU" /><Select aria-label="Ubicación" value={loc} onChange={(e) => { setLoc(e.target.value); setPage(1); }}><option value="">Todas las ubicaciones</option>{locs.filter((l) => l.isActive).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select><Checkbox label={`Solo stock bajo (≤ ${LOW_STOCK_THRESHOLD})`} checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} /></div>
          <DataTable caption="Niveles de inventario" loading={levels.isLoading} error={levels.error ? errorMessage(levels.error) : undefined} rows={levels.data?.items} rowKey={(r) => r.id}
            pagination={levels.data && { page: levels.data.page, totalPages: levels.data.totalPages, total: levels.data.total, onChange: setPage }}
            empty={<EmptyState title="Sin resultados" text="No hay niveles de inventario con esos filtros." />}
            columns={[
              { key: "p", header: "Variante", cell: (r) => <p className="font-medium">{r.variantTitle}</p> },
              { key: "s", header: "SKU", cell: (r) => <code className="text-xs">{r.sku || "—"}</code> },
              { key: "l", header: "Ubicación", cell: (r) => r.location },
              { key: "h", header: "En mano", align: "right", cell: (r) => r.onHand },
              { key: "r", header: "Reservado", align: "right", cell: (r) => r.reserved },
              { key: "q", header: "Disponible", align: "right", cell: (r) => <Badge tone={r.available <= 0 ? "danger" : r.lowStock ? "warn" : "ok"}>{r.available}</Badge> },
              { key: "a", header: "", align: "right", cell: (r) => can ? <Button size="sm" icon={<SlidersHorizontal className="size-3.5" />} onClick={() => open(r)}>Ajustar</Button> : null },
            ]} />
        </>}
        {tab === "history" && <HistoryTab locs={locs} />}
        {tab === "locations" && <Locations can={can} />}
      </div>
      <Dialog open={!!target} onClose={() => setTarget(null)} title="Ajustar stock" size="sm"
        footer={<><Button onClick={() => setTarget(null)}>Cancelar</Button><Button variant="primary" loading={adjust.isPending} disabled={invalid} onClick={apply}>Aplicar</Button></>}>
        {target && <div className="space-y-3"><p className="text-sm">{target.variantTitle} · {target.location} · en mano <b>{target.onHand}</b>{target.reserved > 0 && <> · reservado <b>{target.reserved}</b></>}</p>
          <Select label="Tipo de ajuste" value={mode} onChange={(e) => { setMode(e.target.value as "delta" | "setTo"); setQty(0); }}><option value="delta">Sumar / restar</option><option value="setTo">Fijar cantidad</option></Select>
          <Input label={mode === "delta" ? "Cambio (+ suma, − resta)" : "Nueva cantidad en mano"} type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} hint={`Quedará en ${result}`} error={result < 0 ? "No puede quedar negativo" : result < target.reserved ? `No puede ser menor al reservado (${target.reserved})` : undefined} />
          <Select label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)}>{Object.entries(ADJUST_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Input label="Nota (opcional)" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></div>}
      </Dialog>
    </>
  );
}

function HistoryTab({ locs }: { locs: Location[] }) {
  const h = useAdjustments();
  const canStaff = useCan("staff:read");
  const staff = useStaffNames(canStaff).data;
  /** Nombre de quien hizo el ajuste: con permiso `staff:read` se resuelve con la lista del personal; sin él, "Equipo". */
  const actor = (id: string | null) => (id === null ? "Sistema" : staff?.get(id) ?? "Equipo");
  const where = (id: string) => locs.find((l) => l.id === id)?.name ?? "—";
  return (
    <>
      <DataTable caption="Historial de ajustes" loading={h.isLoading} error={h.error ? errorMessage(h.error) : undefined} rows={h.data} rowKey={(a) => a.id}
        empty={<EmptyState icon={<History className="size-8" />} title="Sin ajustes todavía" text="Los ajustes de stock aparecerán aquí." />}
        columns={[
          { key: "d", header: "Fecha", cell: (a) => <DateTime value={a.at} /> }, { key: "p", header: "Variante", cell: (a) => a.variantTitle }, { key: "l", header: "Ubicación", cell: (a) => where(a.locationId) },
          { key: "x", header: "Cambio", cell: (a) => <Badge tone={a.delta > 0 ? "ok" : "danger"}>{a.delta > 0 ? "+" : ""}{a.delta}</Badge> },
          { key: "r", header: "Motivo", cell: (a) => <>{ADJUST_REASONS[a.reason] ?? a.reason}{a.note && <span className="block text-xs text-muted">{a.note}</span>}</> },
          { key: "u", header: "Usuario", cell: (a) => <span className="text-xs text-muted">{actor(a.actorId)}</span> },
        ]} />
      {h.hasNextPage && <div className="mt-3 text-center"><Button loading={h.isFetchingNextPage} onClick={() => void h.fetchNextPage()}>Cargar más</Button></div>}
    </>
  );
}

function Locations({ can }: { can: boolean }) {
  const { data = [], isLoading, error } = useLocations();
  const save = useSaveLocation(), del = useDeleteLocation(), confirm = useConfirm();
  const [edit, setEdit] = useState<(Partial<Location> & { name: string; replacementDefaultId?: string }) | null>(null);
  const others = data.filter((l) => l.isActive && l.id !== edit?.id);
  const needsReplacement = !!edit?.id && (data.find((l) => l.id === edit.id)?.isDefault ?? false) && (!edit.isActive || edit.isDefault === false);
  return (
    <Card title="Ubicaciones" actions={can ? <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ name: "", isActive: true })}>Nueva</Button> : undefined}>
      {isLoading ? <Skeleton className="h-16" /> : error ? <p role="alert" className="text-sm text-accent-text">{errorMessage(error)}</p> : (
        <ul className="divide-y divide-line">{data.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
            <span className="flex flex-wrap items-center gap-2"><MapPin className="size-4 text-muted" />{l.name}{l.isDefault && <Badge tone="info">Predeterminada</Badge>}{!l.isActive && <Badge>Inactiva</Badge>}</span>
            {can && <span className="flex"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...l })}>Editar</Button><IconButton label={`Eliminar ${l.name}`} onClick={async () => { if (await confirm({ title: "Eliminar ubicación", message: `${l.name}. Solo se pueden eliminar ubicaciones inactivas, no predeterminadas y sin inventario.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(l.id); }}><Trash2 className="size-4" /></IconButton></span>}
          </li>))}</ul>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar ubicación" : "Nueva ubicación"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} disabled={!edit?.name.trim() || (needsReplacement && !edit?.replacementDefaultId)} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null) })}>Guardar</Button></>}>
        {edit && <div className="space-y-3"><Input label="Nombre" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          {edit.id && <>
            <label className="flex items-center justify-between text-sm">Activa<Switch label="Activa" checked={!!edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} /></label>
            <label className="flex items-center justify-between text-sm">Predeterminada<Switch label="Predeterminada" checked={!!edit.isDefault} onChange={(v) => setEdit({ ...edit, isDefault: v })} /></label>
            {needsReplacement && <Select label="Nueva ubicación predeterminada" value={edit.replacementDefaultId ?? ""} onChange={(e) => setEdit({ ...edit, replacementDefaultId: e.target.value })}><option value="">Elegir…</option>{others.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>}
          </>}</div>}
      </Dialog>
    </Card>
  );
}
