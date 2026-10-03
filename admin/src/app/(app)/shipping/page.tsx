"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, Card, Money, PageHeader, Skeleton } from "@/components/ui/Display";
import { Checkbox, Input, MoneyInput, Switch } from "@/components/ui/Form";
import { Dialog, useConfirm } from "@/components/ui/Overlay";
import { useDeleteZone, useSaveTax, useSaveZone, useTax, useZones } from "@/lib/api/admin";
import { uid } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/mock/seed";
import { Can, useCan } from "@/lib/permissions";
import type { ShippingZone } from "@/lib/types";

function Tax() {
  const { data } = useTax(); const save = useSaveTax(); const can = useCan("shipping:write");
  const [t, setT] = useState<{ rate: number; included: boolean } | null>(null);
  const cur = t ?? data;
  if (!cur) return <Skeleton className="h-24" />;
  return (
    <Card title="Impuestos" actions={can ? <Button size="sm" variant="primary" loading={save.isPending} disabled={!t} onClick={() => t && save.mutate(t, { onSuccess: () => setT(null) })}>Guardar</Button> : undefined}>
      <fieldset disabled={!can} className="grid gap-3 sm:grid-cols-2"><Input label="IVA (%)" type="number" min={0} max={100} value={cur.rate} onChange={(e) => setT({ ...cur, rate: Number(e.target.value) })} />
        <label className="flex items-center justify-between gap-3 self-end pb-2 text-sm">Precios incluyen impuestos<Switch label="Precios incluyen impuestos" checked={cur.included} onChange={(v) => setT({ ...cur, included: v })} /></label></fieldset>
    </Card>
  );
}

export default function ShippingPage() {
  const { data, isLoading } = useZones();
  const save = useSaveZone(), del = useDeleteZone(), confirm = useConfirm();
  const can = useCan("shipping:write");
  const [edit, setEdit] = useState<ShippingZone | null>(null);
  const [err, setErr] = useState("");
  const upd = (p: Partial<ShippingZone>) => { setErr(""); setEdit((e) => (e ? { ...e, ...p } : e)); };
  return (
    <>
      <PageHeader title="Envíos e impuestos" actions={<Can perm="shipping:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setErr(""); setEdit({ id: "", name: "", departments: [], rates: [{ id: `rt_${uid()}`, name: "Estándar", price: 12000, freeOver: null, eta: "2–4 días" }] }); }}>Nueva zona</Button></Can>} />
      <div className="space-y-4">
        <Tax />
        {isLoading ? <Skeleton className="h-40" /> : data?.map((z) => (
          <Card key={z.id} title={z.name} actions={can ? <span className="flex gap-1"><Button size="sm" onClick={() => { setErr(""); setEdit(structuredClone(z)); }}>Editar</Button><IconButton label={`Eliminar zona ${z.name}`} onClick={async () => { if (await confirm({ title: "Eliminar zona", message: `Se eliminará ${z.name} y sus tarifas.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(z.id); }}><Trash2 className="size-4" /></IconButton></span> : undefined}>
            <p className="mb-3 flex flex-wrap gap-1">{z.departments.map((d) => <Badge key={d}>{d}</Badge>)}</p>
            <ul className="divide-y divide-line text-sm">{z.rates.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{r.name} <span className="text-muted">· {r.eta}</span></span><span><Money value={r.price} />{r.freeOver ? <span className="ml-2 text-xs text-muted">gratis desde <Money value={r.freeOver} /></span> : null}</span></li>)}</ul>
          </Card>))}
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar zona" : "Nueva zona"} size="lg"
        footer={<><Button onClick={() => setEdit(null)}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null), onError: (e) => setErr(e.message) })}>Guardar</Button></>}>
        {edit && <div className="space-y-4"><Input label="Nombre de la zona" value={edit.name} onChange={(e) => upd({ name: e.target.value })} />
          <fieldset><legend className="mb-1.5 text-xs font-medium">Departamentos ({edit.departments.length})</legend><div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-3">{DEPARTMENTS.map((d) => <Checkbox key={d} label={d} checked={edit.departments.includes(d)} onChange={(e) => upd({ departments: e.target.checked ? [...edit.departments, d] : edit.departments.filter((x) => x !== d) })} />)}</div></fieldset>
          <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Tarifas</h3><Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => upd({ rates: [...edit.rates, { id: `rt_${uid()}`, name: "", price: 0, freeOver: null, eta: "" }] })}>Añadir</Button></div>
            <div className="space-y-2">{edit.rates.map((r, i) => { const up = (p: Partial<typeof r>) => upd({ rates: edit.rates.map((x, k) => (k === i ? { ...x, ...p } : x)) }); return (
              <div key={r.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"><Input label="Nombre" value={r.name} onChange={(e) => up({ name: e.target.value })} /><MoneyInput label="Precio" value={r.price} onChange={(v) => up({ price: v ?? 0 })} /><MoneyInput label="Gratis desde" value={r.freeOver ?? undefined} onChange={(v) => up({ freeOver: v ?? null })} /><Input label="Tiempo" value={r.eta} onChange={(e) => up({ eta: e.target.value })} /><IconButton label="Quitar tarifa" onClick={() => upd({ rates: edit.rates.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton></div>); })}</div></div>
          {err && <p role="alert" className="text-sm text-red-500">{err}</p>}</div>}
      </Dialog>
    </>
  );
}
