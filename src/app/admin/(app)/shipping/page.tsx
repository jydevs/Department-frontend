"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Card, EmptyState, Money, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { Checkbox, Input, MoneyInput, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { NEW_RATE, ZoneSaveError, useDeleteZone, useSaveTax, useSaveZone, useTax, useZones } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { uid } from "@/lib/admin/format";
import { hasMax2Decimals } from "@/lib/admin/validate";
import { Can, useCan } from "@/lib/admin/permissions";
import { DEPARTMENTS } from "@/lib/geo";
import type { ShippingRate, ShippingZone, TaxSettings } from "@/lib/admin/types";

const eta = (r: ShippingRate) => (r.minDays == null && r.maxDays == null ? "" : r.minDays === r.maxDays || r.maxDays == null ? `${r.minDays} días` : r.minDays == null ? `hasta ${r.maxDays} días` : `${r.minDays}–${r.maxDays} días`);
/** Se conserva el valor tal cual (sin redondear) para que la validación avise si no es un entero. */
const days = (v: string) => (v === "" ? null : Number(v));

function Tax() {
  const { data, isLoading, error } = useTax(); const save = useSaveTax(); const can = useCan("settings:write");
  const [t, setT] = useState<TaxSettings | null>(null);
  const cur = t ?? data;
  const rateErr = cur && (!Number.isFinite(cur.rate) || cur.rate < 0 || cur.rate > 100 ? "Debe estar entre 0 y 100" : !hasMax2Decimals(cur.rate) ? "Máximo 2 decimales" : undefined);
  if (isLoading) return <Skeleton className="h-24" />;
  if (!cur) return <Card title="Impuestos"><p role="alert" className="text-sm text-accent-text">{error ? errorMessage(error) : "No disponible"}</p></Card>;
  return (
    <Card title="Impuestos" actions={can ? <Button size="sm" variant="primary" loading={save.isPending} disabled={!t || !!rateErr} onClick={() => t && save.mutate(t, { onSuccess: () => setT(null) })}>Guardar</Button> : undefined}>
      <fieldset disabled={!can} className="grid gap-3 sm:grid-cols-3"><Input label="Etiqueta" value={cur.label} maxLength={40} onChange={(e) => setT({ ...cur, label: e.target.value })} /><Input label="Tarifa (%)" type="number" min={0} max={100} step="0.01" error={rateErr} value={cur.rate} onChange={(e) => setT({ ...cur, rate: Number(e.target.value) })} />
        <label className="flex items-center justify-between gap-3 self-end pb-2 text-sm">Precios incluyen impuestos<Switch label="Precios incluyen impuestos" checked={cur.included} onChange={(v) => setT({ ...cur, included: v })} /></label></fieldset>
      {save.error && <p role="alert" className="mt-3 text-sm text-accent-text">{errorMessage(save.error)}</p>}
    </Card>
  );
}

export default function ShippingPage() {
  const { data, isLoading, error } = useZones();
  const save = useSaveZone(), del = useDeleteZone(), confirm = useConfirm();
  const can = useCan("shipping:write");
  const [edit, setEdit] = useState<ShippingZone | null>(null);
  const [err, setErr] = useState("");
  const upd = (p: Partial<ShippingZone>) => { setErr(""); setEdit((e) => (e ? { ...e, ...p } : e)); };
  const whole = edit?.departments.includes("*") ?? false;
  const open = (z: ShippingZone | null) => { setErr(""); setEdit(z ? structuredClone(z) : { id: "", name: "", departments: [], active: true, rates: [{ id: `${NEW_RATE}${uid()}`, name: "Estándar", price: 12000, freeOver: null, minDays: 2, maxDays: 4, active: true, position: 0 }] }); };
  return (
    <>
      <PageHeader title="Envíos e impuestos" actions={<Can perm="shipping:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => open(null)}>Nueva zona</Button></Can>} />
      <div className="space-y-4">
        <Tax />
        {isLoading ? <Skeleton className="h-40" /> : error ? <p role="alert" className="text-sm text-accent-text">{errorMessage(error)}</p> : !data?.length ? <EmptyState title="Sin zonas de envío" text="Crea una zona para poder vender con envío." /> : data.map((z) => (
          <Card key={z.id} title={z.name} actions={<span className="flex items-center gap-1">{!z.active && <Badge>Inactiva</Badge>}{can && <><Button size="sm" onClick={() => open(z)}>Editar</Button><IconButton label={`Eliminar zona ${z.name}`} onClick={async () => { if (await confirm({ title: "Eliminar zona", message: `Se eliminará ${z.name} y sus tarifas.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(z.id); }}><Trash2 className="size-4" /></IconButton></>}</span>}>
            <p className="mb-3 flex flex-wrap gap-1">{z.departments.map((d) => <Badge key={d}>{d === "*" ? "Todo el país" : d}</Badge>)}</p>
            {z.rates.length === 0 ? <p className="text-sm text-muted">Sin tarifas.</p> : <ul className="divide-y divide-line text-sm">{z.rates.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{r.name}{eta(r) && <span className="text-muted"> · {eta(r)}</span>}{!r.active && <span className="ml-2"><Badge>Inactiva</Badge></span>}</span><span><Money value={r.price} />{r.freeOver != null ? <span className="ml-2 text-xs text-muted">gratis desde <Money value={r.freeOver} /></span> : null}</span></li>)}</ul>}
          </Card>))}
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar zona" : "Nueva zona"} size="lg"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null), onError: (e) => { setErr(errorMessage(e)); if (e instanceof ZoneSaveError) setEdit(e.zone); } })}>Guardar</Button></>}>
        {edit && <div className="space-y-4"><Input label="Nombre de la zona" value={edit.name} maxLength={120} onChange={(e) => upd({ name: e.target.value })} />
          <label className="flex items-center justify-between text-sm">Zona activa<Switch label="Zona activa" checked={edit.active} onChange={(v) => upd({ active: v })} /></label>
          <fieldset><legend className="mb-1.5 text-xs font-medium">Departamentos ({whole ? "todo el país" : edit.departments.length})</legend>
            <div className="mb-2"><Checkbox label="Todo el país (*)" checked={whole} onChange={(e) => upd({ departments: e.target.checked ? ["*"] : [] })} /></div>
            <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-sm border border-line p-2 sm:grid-cols-3">{DEPARTMENTS.map((d) => <Checkbox key={d} label={d} disabled={whole} checked={edit.departments.includes(d)} onChange={(e) => upd({ departments: e.target.checked ? [...edit.departments, d] : edit.departments.filter((x) => x !== d) })} />)}</div></fieldset>
          <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Tarifas</h3><Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => upd({ rates: [...edit.rates, { id: `${NEW_RATE}${uid()}`, name: "", price: 0, freeOver: null, minDays: null, maxDays: null, active: true, position: edit.rates.length }] })}>Añadir</Button></div>
            <div className="space-y-3">{edit.rates.map((r, i) => { const up = (p: Partial<ShippingRate>) => upd({ rates: edit.rates.map((x, k) => (k === i ? { ...x, ...p } : x)) }); return (
              <div key={r.id} className="grid items-end gap-2 rounded-sm border border-line p-2 sm:grid-cols-[1.4fr_1fr_1fr_5rem_5rem_auto_auto]"><Input label="Nombre" value={r.name} maxLength={120} error={r.name.trim().length > 120 ? "Máximo 120 caracteres" : undefined} onChange={(e) => up({ name: e.target.value })} /><MoneyInput label="Precio" value={r.price} onChange={(v) => up({ price: v ?? 0 })} /><MoneyInput label="Gratis desde" value={r.freeOver ?? undefined} onChange={(v) => up({ freeOver: v ?? null })} />
                <Input label="Días mín." type="number" min={0} max={365} step={1} value={r.minDays ?? ""} onChange={(e) => up({ minDays: days(e.target.value) })} /><Input label="Días máx." type="number" min={0} max={365} step={1} value={r.maxDays ?? ""} onChange={(e) => up({ maxDays: days(e.target.value) })} />
                <label className="flex items-center gap-2 pb-2 text-xs">Activa<Switch label={`Tarifa activa ${r.name}`} checked={r.active} onChange={(v) => up({ active: v })} /></label><IconButton label="Quitar tarifa" onClick={() => upd({ rates: edit.rates.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton></div>); })}</div></div>
          {err && <p role="alert" className="text-sm text-accent-text">{err}</p>}</div>}
      </Dialog>
    </>
  );
}
