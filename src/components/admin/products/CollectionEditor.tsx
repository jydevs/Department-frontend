"use client";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Card, PageHeader, Spinner } from "@/components/admin/ui/Display";
import { Input, Select, Switch, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { useAllProducts, useDeleteCollection, usePreviewRules, useSaveCollection } from "@/lib/admin/api/catalog";
import { useCan } from "@/lib/admin/permissions";
import type { Collection, Rule } from "@/lib/admin/types";
import { SeoPreview } from "./SeoPreview";

const FIELDS: Record<Rule["field"], string> = { tag: "Etiqueta", type: "Tipo", vendor: "Proveedor", price: "Precio", title: "Título" };
const OPS: Record<Rule["op"], string> = { equals: "es igual a", contains: "contiene", gt: "mayor que", lt: "menor que" };

export function CollectionEditor({ initial }: { initial: Collection }) {
  const router = useRouter(), confirm = useConfirm(), can = useCan("collections:write");
  const [c, setC] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pick, setPick] = useState(false);
  const [q, setQ] = useState("");
  const all = useAllProducts().data ?? [];
  const save = useSaveCollection((s) => { setDirty(false); if (!initial.id) router.replace(`/admin/collections/${s.id}`); });
  const del = useDeleteCollection(() => router.push("/admin/collections"));
  const set = (p: Partial<Collection>) => { setC((x) => ({ ...x, ...p })); setDirty(true); };
  const preview = usePreviewRules(c);
  const manual = c.productIds.map((id) => all.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const results = q.trim() ? all.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) && !c.productIds.includes(p.id)).slice(0, 6) : [];
  const setRule = (i: number, patch: Partial<Rule>) => set({ rules: c.rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  return (
    <>
      <PageHeader title={initial.id ? c.title || "Colección" : "Nueva colección"} breadcrumbs={[{ label: "Colecciones", href: "/admin/collections" }, { label: initial.id ? "Editar" : "Nueva" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {initial.id && can && <Button variant="danger" onClick={async () => { if (await confirm({ title: "Eliminar colección", message: "Los productos no se eliminan.", danger: true, confirmLabel: "Eliminar" })) del.mutate(initial.id); }}>Eliminar</Button>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(c)}>Guardar</Button>}
        </>} />
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><div className="space-y-3">
            <Input label="Título" value={c.title} onChange={(e) => set({ title: e.target.value })} error={dirty && !c.title.trim() ? "El título es obligatorio" : undefined} />
            <Textarea label="Descripción" value={c.description} onChange={(e) => set({ description: e.target.value })} />
          </div></Card>
          <Card title={c.kind === "manual" ? "Productos (orden manual)" : "Reglas de la colección"}>
            <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Tipo de colección">
              {(["manual", "smart"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={c.kind === k} onClick={() => set({ kind: k })} className={`rounded-sm border px-3 py-1.5 text-sm ${c.kind === k ? "border-accent bg-accent/10 text-accent-text" : "border-line text-muted"}`}>{k === "manual" ? "Manual" : "Inteligente"}</button>)}
            </div>
            {c.kind === "manual" ? (
              <div className="space-y-3">
                <div className="relative"><Input aria-label="Buscar producto para añadir" placeholder="Buscar producto para añadir…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {results.length > 0 && <ul className="absolute z-10 mt-1 w-full rounded-sm border border-line bg-surface p-1 shadow-xl">{results.map((p) => <li key={p.id}><button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface2" onClick={() => { set({ productIds: [...c.productIds, p.id] }); setQ(""); }}><Plus className="size-3.5" />{p.title}</button></li>)}</ul>}</div>
                {manual.length === 0 && <p className="text-sm text-muted">Sin productos. Busca arriba para añadir.</p>}
                <SortableList items={manual} getId={(p) => p.id} onChange={(next) => set({ productIds: next.map((p) => p.id), sort: "manual" })}>
                  {(p, handle) => (
                    <div className="mb-1.5 flex items-center gap-2 rounded-sm border border-line bg-surface p-2">{handle}<Image src={p.images[0]?.url ?? ""} alt="" width={32} height={40} unoptimized className="h-10 w-8 rounded object-cover" /><span className="flex-1 truncate text-sm">{p.title}</span><IconButton label={`Quitar ${p.title}`} onClick={() => set({ productIds: c.productIds.filter((x) => x !== p.id) })}><X className="size-4" /></IconButton></div>
                  )}
                </SortableList>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">Los productos deben cumplir <Select aria-label="Coincidir con" className="w-28" value={c.match} onChange={(e) => set({ match: e.target.value as Collection["match"] })}><option value="all">todas</option><option value="any">alguna</option></Select> de estas reglas:</div>
                {c.rules.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
                    <Select aria-label="Campo" value={r.field} onChange={(e) => setRule(i, { field: e.target.value as Rule["field"] })}>{Object.entries(FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                    <Select aria-label="Condición" value={r.op} onChange={(e) => setRule(i, { op: e.target.value as Rule["op"] })}>{Object.entries(OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                    <Input aria-label="Valor" value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} />
                    <IconButton label="Quitar regla" onClick={() => set({ rules: c.rules.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>
                  </div>
                ))}
                <Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ rules: [...c.rules, { field: "tag", op: "equals", value: "" }] })}>Añadir regla</Button>
                <div className="rounded-sm border border-line bg-surface2 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium">Vista previa en vivo {preview.isFetching ? <Spinner className="size-3" /> : <Badge tone="info">{preview.data?.length ?? 0} productos</Badge>}</p>
                  <ul className="flex flex-wrap gap-1.5">{preview.data?.map((p) => <li key={p.id}><Badge>{p.title}</Badge></li>)}</ul>
                </div>
              </div>
            )}
          </Card>
          <Card title="SEO"><div className="space-y-3">
            <SeoPreview title={c.seoTitle || c.title} description={c.seoDescription} handle={c.handle} base="daregulardept.com/collections" />
            <Input label="Título SEO" value={c.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} /><Textarea label="Descripción SEO" rows={2} value={c.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
            <Input label="Handle (URL)" value={c.handle} onChange={(e) => set({ handle: e.target.value })} />
          </div></Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...c.metafields, { key: "", value: "" }] })}>Añadir</Button>}>
            {c.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{c.metafields.map((m, i) => <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2"><Input aria-label="Clave" value={m.key} onChange={(e) => set({ metafields: c.metafields.map((x, k) => (k === i ? { ...x, key: e.target.value } : x)) })} /><Input aria-label="Valor" value={m.value} onChange={(e) => set({ metafields: c.metafields.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) })} /><IconButton label="Quitar" onClick={() => set({ metafields: c.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton></div>)}</div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Publicación"><label className="flex items-center justify-between text-sm">{c.published ? "Publicada" : "Oculta"}<Switch label="Publicada" checked={c.published} onChange={(v) => set({ published: v })} /></label></Card>
          <Card title="Orden de productos"><Select aria-label="Orden" value={c.sort} onChange={(e) => set({ sort: e.target.value as Collection["sort"] })}><option value="manual">Manual</option><option value="best-selling">Más vendidos</option><option value="newest">Más nuevos</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option><option value="title">Alfabético</option></Select></Card>
          <Card title="Imagen" actions={<Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => setPick(true)}>{c.image ? "Cambiar" : "Elegir"}</Button>}>
            {c.image ? <Image src={c.image} alt="Imagen de la colección" width={320} height={200} unoptimized className="w-full rounded-sm object-cover" /> : <p className="text-sm text-muted">Sin imagen.</p>}
            <MediaPicker open={pick} onClose={() => setPick(false)} onPick={([m]) => m && set({ image: m.url })} />
          </Card>
        </div>
      </fieldset>
    </>
  );
}
