"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, Money, PageHeader } from "@/components/admin/ui/Display";
import { DateTimeInput, Input, MoneyInput, Select, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { blankDiscount, useDeleteDiscount, useDiscounts, useSaveDiscount } from "@/lib/admin/api/admin";
import { Can, useCan } from "@/lib/admin/permissions";
import type { Discount } from "@/lib/admin/types";

const KIND = { percentage: "Porcentaje", fixed: "Monto fijo", "free-shipping": "Envío gratis" } as const;
export default function DiscountsPage() {
  const { data, isLoading } = useDiscounts();
  const save = useSaveDiscount(), del = useDeleteDiscount(), confirm = useConfirm();
  const can = useCan("discounts:write");
  const [edit, setEdit] = useState<Discount | null>(null);
  const [err, setErr] = useState("");
  const set = (p: Partial<Discount>) => { setErr(""); setEdit((e) => (e ? { ...e, ...p } : e)); };
  return (
    <>
      <PageHeader title="Descuentos" actions={<Can perm="discounts:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setErr(""); setEdit(blankDiscount()); }}>Nuevo descuento</Button></Can>} />
      <DataTable caption="Descuentos" loading={isLoading} rows={data} rowKey={(d) => d.id} onRowClick={(d) => { setErr(""); setEdit(d); }}
        columns={[
          { key: "c", header: "Código", sortValue: (d) => d.code, cell: (d) => <code className="font-semibold">{d.code}</code> },
          { key: "t", header: "Tipo", cell: (d) => `${KIND[d.kind]}${d.kind === "percentage" ? ` ${d.value}%` : d.kind === "fixed" ? ` $${d.value.toLocaleString("es-CO")}` : ""}` },
          { key: "s", header: "Estado", cell: (d) => <Badge tone={d.active && (!d.endsAt || new Date(d.endsAt) > new Date()) ? "ok" : "neutral"}>{d.active ? (d.endsAt && new Date(d.endsAt) < new Date() ? "Vencido" : "Activo") : "Inactivo"}</Badge> },
          { key: "u", header: "Usos", sortValue: (d) => d.used, cell: (d) => `${d.used}${d.usageLimit ? ` / ${d.usageLimit}` : ""}` },
          { key: "v", header: "Vigencia", cell: (d) => <span className="text-xs"><DateTime value={d.startsAt} />{d.endsAt ? <> → <DateTime value={d.endsAt} /></> : " → sin fin"}</span> },
          { key: "a", header: "", align: "right", cell: (d) => can ? <span onClick={(e) => e.stopPropagation()}><IconButton label={`Eliminar ${d.code}`} onClick={async () => { if (await confirm({ title: "Eliminar descuento", message: `Se eliminará ${d.code}.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(d.id); }}><Trash2 className="size-4" /></IconButton></span> : null },
        ]} />
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Descuento ${edit.code}` : "Nuevo descuento"} size="lg"
        footer={<><Button onClick={() => setEdit(null)}>Cerrar</Button>{can && <Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null), onError: (e) => setErr(e.message) })}>Guardar</Button>}</>}>
        {edit && <fieldset disabled={!can} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Código" value={edit.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
            <Select label="Tipo" value={edit.kind} onChange={(e) => set({ kind: e.target.value as Discount["kind"] })}><option value="percentage">Porcentaje</option><option value="fixed">Monto fijo</option><option value="free-shipping">Envío gratis</option></Select>
            {edit.kind === "percentage" && <Input label="Porcentaje (1–100)" type="number" min={1} max={100} value={edit.value} onChange={(e) => set({ value: Number(e.target.value) })} />}
            {edit.kind === "fixed" && <MoneyInput label="Monto de descuento" value={edit.value} onChange={(v) => set({ value: v ?? 0 })} />}
            <MoneyInput label="Subtotal mínimo" value={edit.minSubtotal} onChange={(v) => set({ minSubtotal: v ?? 0 })} />
            <Input label="Límite total de usos" type="number" min={0} placeholder="Sin límite" value={edit.usageLimit ?? ""} onChange={(e) => set({ usageLimit: e.target.value ? Number(e.target.value) : null })} />
            <DateTimeInput label="Inicio" value={edit.startsAt} onChange={(v) => v && set({ startsAt: v })} /><DateTimeInput label="Fin (opcional)" value={edit.endsAt} onChange={(v) => set({ endsAt: v })} />
          </div>
          <label className="flex items-center justify-between text-sm">Un uso por cliente<Switch label="Un uso por cliente" checked={edit.perCustomer} onChange={(v) => set({ perCustomer: v })} /></label>
          <label className="flex items-center justify-between text-sm">Activo<Switch label="Activo" checked={edit.active} onChange={(v) => set({ active: v })} /></label>
          {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
          {edit.id && <div><h3 className="mb-2 text-sm font-semibold">Redenciones ({edit.used})</h3>{edit.redemptions.length === 0 ? <p className="text-xs text-muted">Sin detalle de redenciones.</p> : <ul className="space-y-1 text-sm">{edit.redemptions.map((r) => <li key={r.orderNumber} className="flex justify-between"><span>#{r.orderNumber} · {r.customer} · <DateTime value={r.at} /></span><Money value={r.amount} /></li>)}</ul>}</div>}
        </fieldset>}
      </Dialog>
    </>
  );
}
