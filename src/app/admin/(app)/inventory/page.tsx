"use client";
import { History, MapPin, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, Card, DateTime, EmptyState, PageHeader, Tabs } from "@/components/admin/ui/Display";
import { Input, SearchInput, Select, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { useAdjustStock, useAdjustments, useDeleteLocation, useLevels, useLocations, useSaveLocation } from "@/lib/admin/api/catalog";
import { useCan } from "@/lib/admin/permissions";
import type { Location } from "@/lib/admin/types";

const REASONS = ["Recepción de mercancía", "Conteo físico", "Daño o pérdida", "Devolución", "Otro"];

export default function InventoryPage() {
  const [tab, setTab] = useState<"levels" | "history" | "locations">("levels");
  const [q, setQ] = useState(""), [loc, setLoc] = useState("");
  const onSearch = useCallback((v: string) => setQ(v), []);
  const levels = useLevels(q, loc), locs = useLocations().data ?? [];
  const history = useAdjustments();
  const can = useCan("inventory:write");
  const adjust = useAdjustStock();
  const [target, setTarget] = useState<{ id: string; label: string; stock: number } | null>(null);
  const [delta, setDelta] = useState(0), [reason, setReason] = useState(REASONS[0]);
  return (
    <>
      <PageHeader title="Inventario" />
      <Tabs tabs={[{ key: "levels", label: "Niveles" }, { key: "history", label: "Historial" }, { key: "locations", label: "Ubicaciones" }]} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "levels" && <>
          <div className="mb-3 grid gap-2 sm:grid-cols-3"><SearchInput onSearch={onSearch} placeholder="Producto o SKU" className="sm:col-span-2" /><Select aria-label="Ubicación" value={loc} onChange={(e) => setLoc(e.target.value)}><option value="">Todas las ubicaciones</option>{locs.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></div>
          <DataTable caption="Niveles de inventario" loading={levels.isLoading} rows={levels.data} rowKey={(r) => r.variant.id}
            columns={[
              { key: "p", header: "Producto", sortValue: (r) => r.product, cell: (r) => <div><p className="font-medium">{r.product}</p><p className="text-xs text-muted">{r.variant.title}</p></div> },
              { key: "s", header: "SKU", cell: (r) => <code className="text-xs">{r.variant.sku}</code> },
              { key: "q", header: "Disponible", sortValue: (r) => r.shown, cell: (r) => r.variant.tracked ? <Badge tone={r.shown <= 3 ? "danger" : r.shown <= 8 ? "warn" : "ok"}>{r.shown}</Badge> : <span className="text-muted">Sin seguimiento</span> },
              { key: "a", header: "", align: "right", cell: (r) => can && r.variant.tracked ? <Button size="sm" icon={<SlidersHorizontal className="size-3.5" />} onClick={() => { setTarget({ id: r.variant.id, label: `${r.product} · ${r.variant.title}`, stock: r.variant.stock }); setDelta(0); }}>Ajustar</Button> : null },
            ]} />
        </>}
        {tab === "history" && <DataTable caption="Historial de ajustes" loading={history.isLoading} rows={history.data} rowKey={(a) => a.id}
          empty={<EmptyState icon={<History className="size-8" />} title="Sin ajustes todavía" text="Los ajustes de stock aparecerán aquí." />}
          columns={[{ key: "d", header: "Fecha", cell: (a) => <DateTime value={a.at} /> }, { key: "p", header: "Producto", cell: (a) => `${a.productTitle} · ${a.variantTitle}` }, { key: "x", header: "Cambio", cell: (a) => <Badge tone={a.delta > 0 ? "ok" : "danger"}>{a.delta > 0 ? "+" : ""}{a.delta}</Badge> }, { key: "r", header: "Motivo", cell: (a) => a.reason }, { key: "u", header: "Usuario", cell: (a) => a.actor }]} />}
        {tab === "locations" && <Locations can={can} />}
      </div>
      <Dialog open={!!target} onClose={() => setTarget(null)} title="Ajustar stock" size="sm"
        footer={<><Button onClick={() => setTarget(null)}>Cancelar</Button><Button variant="primary" loading={adjust.isPending} disabled={delta === 0} onClick={() => target && adjust.mutate({ variantId: target.id, delta, reason }, { onSuccess: () => setTarget(null) })}>Aplicar</Button></>}>
        <div className="space-y-3"><p className="text-sm">{target?.label} · actual <b>{target?.stock}</b></p>
          <Input label="Cambio (+ suma, − resta)" type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} hint={target ? `Quedará en ${target.stock + delta}` : undefined} error={target && target.stock + delta < 0 ? "No puede quedar negativo" : undefined} />
          <Select label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</Select></div>
      </Dialog>
    </>
  );
}

function Locations({ can }: { can: boolean }) {
  const { data = [] } = useLocations();
  const save = useSaveLocation(), del = useDeleteLocation(), confirm = useConfirm();
  const [edit, setEdit] = useState<Location | null>(null);
  return (
    <Card title="Ubicaciones" actions={can ? <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ id: "", name: "", city: "", active: true })}>Nueva</Button> : undefined}>
      <ul className="divide-y divide-line">{data.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
          <span className="flex items-center gap-2"><MapPin className="size-4 text-muted" />{l.name} <span className="text-muted">· {l.city}</span>{!l.active && <Badge>Inactiva</Badge>}</span>
          {can && <span className="flex"><Button size="sm" variant="ghost" onClick={() => setEdit(l)}>Editar</Button><IconButton label={`Eliminar ${l.name}`} onClick={async () => { if (await confirm({ title: "Eliminar ubicación", message: l.name, danger: true, confirmLabel: "Eliminar" })) del.mutate(l.id); }}><Trash2 className="size-4" /></IconButton></span>}
        </li>))}</ul>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar ubicación" : "Nueva ubicación"} size="sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null) })}>Guardar</Button></>}>
        {edit && <div className="space-y-3"><Input label="Nombre" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label="Ciudad" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /><label className="flex items-center justify-between text-sm">Activa<Switch label="Activa" checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /></label></div>}
      </Dialog>
    </Card>
  );
}
