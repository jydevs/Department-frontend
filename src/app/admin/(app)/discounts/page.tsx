"use client";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, Money, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { DateTimeInput, Input, MoneyInput, SearchInput, Select, Switch } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { blankDiscount, useDeleteDiscount, useDiscounts, useRedemptions, useSaveDiscount, useToggleDiscount, type DiscountFilters } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { Can, useCan } from "@/lib/admin/permissions";
import type { Discount } from "@/lib/admin/types";

const KIND = { percent: "Porcentaje", fixed: "Monto fijo", free_shipping: "Envío gratis" } as const;

function Redemptions({ id }: { id: string }) {
  const { data, isLoading, error } = useRedemptions(id);
  return (
    <div><h3 className="mb-2 text-sm font-semibold">Redenciones{data ? ` (${data.total})` : ""}</h3>
      {data && data.total > data.items.length && <p className="mb-2 text-xs text-muted">Mostrando {data.items.length} de {data.total} redenciones.</p>}
      {isLoading ? <Skeleton className="h-10" /> : error ? <p role="alert" className="text-xs text-accent-text">{errorMessage(error)}</p> : !data?.items.length ? <p className="text-xs text-muted">Aún no se ha usado.</p>
        : <ul className="space-y-1 text-sm">{data.items.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.orderNumber ? `#${r.orderNumber}` : "—"} · {r.email} · <DateTime value={r.at} /></span><Money value={r.amount} /></li>)}</ul>}
    </div>
  );
}

export default function DiscountsPage() {
  const [f, setF] = useState<DiscountFilters>({ q: "", active: "", page: 1 });
  const { data, isLoading, error } = useDiscounts(f);
  const save = useSaveDiscount(), del = useDeleteDiscount(), toggle = useToggleDiscount(), confirm = useConfirm();
  const can = useCan("discounts:write");
  const [edit, setEdit] = useState<Discount | null>(null);
  const [err, setErr] = useState("");
  const set = (p: Partial<Discount>) => { setErr(""); setEdit((e) => (e ? { ...e, ...p } : e)); };
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const status = (d: Discount) => (!d.active ? ["Inactivo", "neutral"] as const : d.endsAt && new Date(d.endsAt) < new Date() ? ["Vencido", "warn"] as const : new Date(d.startsAt) > new Date() ? ["Programado", "info"] as const : d.usageLimit && d.used >= d.usageLimit ? ["Agotado", "warn"] as const : ["Activo", "ok"] as const);
  return (
    <>
      <PageHeader title="Descuentos" actions={<Can perm="discounts:write"><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setErr(""); setEdit(blankDiscount()); }}>Nuevo descuento</Button></Can>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-3"><SearchInput onSearch={onSearch} placeholder="Buscar código" className="sm:col-span-2" />
        <Select aria-label="Estado" value={f.active} onChange={(e) => setF({ ...f, active: e.target.value, page: 1 })}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></Select></div>
      <DataTable caption="Descuentos" loading={isLoading} rows={data?.items} rowKey={(d) => d.id} onRowClick={(d) => { setErr(""); setEdit(d); }} error={error ? errorMessage(error) : undefined}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "c", header: "Código", cell: (d) => <div><code className="font-semibold">{d.code}</code><p className="text-xs text-muted">{d.title}</p></div> },
          { key: "t", header: "Tipo", cell: (d) => `${KIND[d.kind]}${d.kind === "percent" ? ` ${d.value}%` : d.kind === "fixed" ? ` $${d.value.toLocaleString("es-CO")}` : ""}` },
          { key: "s", header: "Estado", cell: (d) => { const [l, tone] = status(d); return <Badge tone={tone}>{l}</Badge>; } },
          { key: "u", header: "Usos", cell: (d) => `${d.used}${d.usageLimit ? ` / ${d.usageLimit}` : ""}` },
          { key: "v", header: "Vigencia", cell: (d) => <span className="text-xs"><DateTime value={d.startsAt} />{d.endsAt ? <> → <DateTime value={d.endsAt} /></> : " → sin fin"}</span> },
          { key: "a", header: "Activo", cell: (d) => can ? <span onClick={(e) => e.stopPropagation()}><Switch label={`Activar ${d.code}`} checked={d.active} disabled={toggle.isPending} onChange={(v) => toggle.mutate({ id: d.id, active: v })} /></span> : null },
          { key: "x", header: "", align: "right", cell: (d) => can ? <span onClick={(e) => e.stopPropagation()}><IconButton label={`Eliminar ${d.code}`} onClick={async () => { if (await confirm({ title: "Eliminar descuento", message: `Se eliminará ${d.code}.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(d.id); }}><Trash2 className="size-4" /></IconButton></span> : null },
        ]} />
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Descuento ${edit.code}` : "Nuevo descuento"} size="lg"
        footer={<><Button onClick={() => setEdit(null)}>Cerrar</Button>{can && <Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit, { onSuccess: () => setEdit(null), onError: (e) => setErr(errorMessage(e)) })}>Guardar</Button>}</>}>
        {edit && <fieldset disabled={!can} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Código" value={edit.code} disabled={!!edit.id} hint={edit.id ? "El código y el tipo no se pueden cambiar." : undefined} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
            <Input label="Título (interno)" value={edit.title} onChange={(e) => set({ title: e.target.value })} />
            <Select label="Tipo" value={edit.kind} disabled={!!edit.id} onChange={(e) => set({ kind: e.target.value as Discount["kind"], value: e.target.value === "free_shipping" ? 0 : edit.value || 10 })}><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option><option value="free_shipping">Envío gratis</option></Select>
            {edit.kind === "percent" && <Input label="Porcentaje (1–100)" type="number" min={1} max={100} step={1} value={edit.value === 0 ? "" : edit.value} onChange={(e) => set({ value: Number(e.target.value) })} />}
            {edit.kind === "fixed" && <MoneyInput label="Monto de descuento" value={edit.value} onChange={(v) => set({ value: v ?? 0 })} />}
            <MoneyInput label="Subtotal mínimo" value={edit.minSubtotal ?? undefined} onChange={(v) => set({ minSubtotal: v ?? null })} />
            <Input label="Límite total de usos" type="number" min={1} step={1} placeholder="Sin límite" value={edit.usageLimit ?? ""} onChange={(e) => set({ usageLimit: e.target.value ? Number(e.target.value) : null })} />
            <DateTimeInput label="Inicio" value={edit.startsAt} onChange={(v) => v && set({ startsAt: v })} /><DateTimeInput label="Fin (opcional)" value={edit.endsAt} onChange={(v) => set({ endsAt: v })} />
          </div>
          <label className="flex items-center justify-between text-sm">Un uso por correo<Switch label="Un uso por correo" checked={edit.oncePerEmail} onChange={(v) => set({ oncePerEmail: v })} /></label>
          <label className="flex items-center justify-between text-sm">Activo<Switch label="Activo" checked={edit.active} onChange={(v) => set({ active: v })} /></label>
          {err && <p role="alert" className="text-sm text-accent-text">{err}</p>}
          {edit.id && <Redemptions id={edit.id} />}
        </fieldset>}
      </Dialog>
    </>
  );
}
