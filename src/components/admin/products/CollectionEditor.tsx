"use client";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUnsavedGuard } from "@/components/admin/shell/useUnsavedGuard";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Card, PageHeader, Spinner } from "@/components/admin/ui/Display";
import { Input, Select, Switch, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { RULE_OPS, rulesReady, useDeleteCollection, usePreviewRules, useProductSearch, useSaveCollection, type CollectionForm as Collection, type Rule } from "@/lib/admin/api/catalog";
import { useMediaMap } from "@/lib/admin/api/media";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { SeoPreview } from "./SeoPreview";

const FIELDS: Record<Rule["field"], string> = { tag: "Etiqueta", type: "Tipo", vendor: "Proveedor", price: "Precio (COP)" };
const OPS: Record<Rule["op"], string> = { eq: "es igual a", neq: "no es igual a", contains: "contiene", gt: "mayor que", lt: "menor que" };

export function CollectionEditor({ initial }: { initial: Collection }) {
  const router = useRouter(), confirm = useConfirm(), can = useCan("collections:write");
  const [base, setBase] = useState(initial);
  const [c, setC] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pick, setPick] = useState(false);
  const [q, setQ] = useState(""), [picked, setPicked] = useState("");
  const media = useMediaMap().data;
  const image = c.imageMediaId ? media?.get(c.imageMediaId) ?? picked : undefined;
  const save = useSaveCollection({
    onSaved: (s) => { setBase(s); setC(s); setDirty(false); setPicked(""); if (!base.id) router.replace(`/admin/collections/${s.id}`); },
    onFail: (id) => router.replace(`/admin/collections/${id}`),
  });
  const del = useDeleteCollection(() => router.push("/admin/collections"));
  useUnsavedGuard(dirty);
  const set = (p: Partial<Collection>) => { setC((x) => ({ ...x, ...p })); setDirty(true); };
  const preview = usePreviewRules(c);
  const search = useProductSearch(q);
  const results = q.trim() ? (search.data ?? []).filter((p) => !c.products.some((x) => x.id === p.id)) : [];
  const setRule = (i: number, patch: Partial<Rule>) => set({ rules: c.rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  return (
    <>
      <PageHeader title={base.id ? c.title || "Colección" : "Nueva colección"} breadcrumbs={[{ label: "Colecciones", href: "/admin/collections" }, { label: base.id ? "Editar" : "Nueva" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {base.id && can && <Button variant="danger" onClick={async () => { if (await confirm({ title: "Eliminar colección", message: "Los productos no se eliminan.", danger: true, confirmLabel: "Eliminar" })) del.mutate(base.id); }}>Eliminar</Button>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate({ draft: c, base: base.id ? base : null })}>Guardar</Button>}
        </>} />
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><div className="space-y-3">
            <Input label="Título" value={c.title} onChange={(e) => set({ title: e.target.value })} error={dirty && !c.title.trim() ? "El título es obligatorio" : undefined} />
            <Textarea label="Descripción (HTML básico)" value={c.description} onChange={(e) => set({ description: e.target.value })} />
          </div></Card>
          <Card title={c.kind === "manual" ? "Productos (orden manual)" : "Reglas de la colección"}>
            <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Tipo de colección">
              {(["manual", "smart"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={c.kind === k} onClick={() => set({ kind: k, ...(k === "smart" && c.rules.length === 0 ? { rules: [{ field: "tag", op: "eq", value: "" }] } : {}) })} className={`font-condensed min-h-10 border px-4 text-xs tracking-[0.12em] ${c.kind === k ? "border-fg bg-fg text-bg" : "border-fg/35 text-muted hover:text-fg"}`}>{k === "manual" ? "Manual" : "Inteligente"}</button>)}
            </div>
            {c.kind === "manual" ? (
              <div className="space-y-3">
                {!c.membersKnown && <p className="rounded-sm border border-line bg-surface2 p-2 text-xs text-muted">La API no permite leer los productos de una colección oculta. Si añades productos aquí, la lista actual se reemplazará por la que definas. Publica la colección para ver sus productos.</p>}
                <div className="relative"><Input aria-label="Buscar producto para añadir" placeholder="Buscar producto para añadir…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {results.length > 0 && <ul className="absolute z-10 mt-1 w-full rounded-sm border border-line bg-surface p-1 shadow-xl">{results.map((p) => <li key={p.id}><button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface2" onClick={() => { set({ products: [...c.products, p] }); setQ(""); }}><Plus className="size-3.5" />{p.title}</button></li>)}</ul>}</div>
                {c.products.length === 0 && <p className="text-sm text-muted">Sin productos. Busca arriba para añadir.</p>}
                <SortableList items={c.products} getId={(p) => p.id} onChange={(next) => set({ products: next, sort: "manual" })}>
                  {(p, handle) => (
                    <div className="mb-1.5 flex items-center gap-2 rounded-sm border border-line bg-surface p-2">{handle}{p.image ? <Image src={p.image} alt="" width={32} height={40} unoptimized className="h-10 w-8 rounded object-cover" /> : <span className="size-8" />}<span className="flex-1 truncate text-sm">{p.title}</span><IconButton label={`Quitar ${p.title}`} onClick={() => set({ products: c.products.filter((x) => x.id !== p.id) })}><X className="size-4" /></IconButton></div>
                  )}
                </SortableList>
                {c.membersKnown && c.published && <p className="text-xs text-muted">Solo se listan los productos activos (los borradores y archivados de la colección no se muestran y se quitarían al reordenar o añadir).</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">Los productos deben cumplir <Select aria-label="Coincidir con" className="w-28" value={c.match} onChange={(e) => set({ match: e.target.value as Collection["match"] })}><option value="all">todas</option><option value="any">alguna</option></Select> de estas reglas:</div>
                {c.rules.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
                    <Select aria-label="Campo" value={r.field} onChange={(e) => setRule(i, { field: e.target.value as Rule["field"], op: RULE_OPS[e.target.value as Rule["field"]].includes(r.op) ? r.op : "eq" })}>{Object.entries(FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                    <Select aria-label="Condición" value={r.op} onChange={(e) => setRule(i, { op: e.target.value as Rule["op"] })}>{RULE_OPS[r.field].map((k) => <option key={k} value={k}>{OPS[k]}</option>)}</Select>
                    <Input aria-label="Valor" value={r.value} inputMode={r.field === "price" ? "numeric" : undefined} onChange={(e) => setRule(i, { value: e.target.value })} />
                    <IconButton label="Quitar regla" onClick={() => set({ rules: c.rules.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>
                  </div>
                ))}
                <Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ rules: [...c.rules, { field: "tag", op: "eq", value: "" }] })}>Añadir regla</Button>
                <div className="rounded-sm border border-line bg-surface2 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium">Vista previa en vivo {preview.isFetching ? <Spinner className="size-3" /> : rulesReady(c) ? <Badge tone="info">{preview.data?.total ?? 0} producto(s) activos</Badge> : <span className="text-muted">completa las reglas</span>}</p>
                  {preview.error && <p role="alert" className="text-xs text-accent-text">{errorMessage(preview.error)}</p>}
                  <ul className="flex flex-wrap gap-1.5">{rulesReady(c) && preview.data?.products.map((p) => <li key={p.id}><Badge>{p.title}</Badge></li>)}</ul>
                  {rulesReady(c) && (preview.data?.total ?? 0) > 24 && <p className="mt-1 text-[11px] text-muted">Se muestran los primeros 24.</p>}
                </div>
              </div>
            )}
          </Card>
          <Card title="SEO"><div className="space-y-3">
            <SeoPreview title={c.seoTitle || c.title} description={c.seoDescription} handle={c.handle} base="daregulardept.com/collections" />
            <Input label="Título SEO" value={c.seoTitle} maxLength={255} onChange={(e) => set({ seoTitle: e.target.value })} /><Textarea label="Descripción SEO" rows={2} value={c.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
            <Input label="Handle (URL)" value={c.handle} onChange={(e) => set({ handle: e.target.value })} />
          </div></Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...c.metafields, { namespace: "custom", key: "", type: "single_line_text", value: "", saved: false }] })}>Añadir</Button>}>
            {c.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{c.metafields.map((m, i) => {
              const upd = (patch: Partial<typeof m>) => set({ metafields: c.metafields.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid grid-cols-[6rem_1fr_2fr_auto] gap-2">
                  <Input aria-label="Espacio de nombres" value={m.namespace} disabled={m.saved} onChange={(e) => upd({ namespace: e.target.value })} />
                  <Input aria-label="Clave" value={m.key} disabled={m.saved} onChange={(e) => upd({ key: e.target.value })} />
                  <Input aria-label="Valor" value={m.value} onChange={(e) => upd({ value: e.target.value })} />
                  {m.saved ? <span className="w-9" /> : <IconButton label="Quitar" onClick={() => set({ metafields: c.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>}
                </div>);
            })}</div>
            {c.metafields.some((m) => m.saved) && <p className="mt-2 text-xs text-muted">Los metafields guardados se pueden editar pero la API no permite eliminarlos.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Publicación"><label className="flex items-center justify-between text-sm">{c.published ? "Publicada" : "Oculta"}<Switch label="Publicada" checked={c.published} onChange={(v) => set({ published: v })} /></label></Card>
          <Card title="Orden de productos"><Select aria-label="Orden" value={c.sort} onChange={(e) => set({ sort: e.target.value as Collection["sort"] })}><option value="manual">Manual</option><option value="newest">Más nuevos</option><option value="price_asc">Precio: menor a mayor</option><option value="price_desc">Precio: mayor a menor</option><option value="title">Alfabético</option></Select></Card>
          <Card title="Imagen" actions={<Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => setPick(true)}>{c.imageMediaId ? "Cambiar" : "Elegir"}</Button>}>
            {image ? <Image src={image} alt="Imagen de la colección" width={320} height={200} unoptimized className="w-full rounded-sm object-cover" /> : <p className="text-sm text-muted">Sin imagen.</p>}
            <MediaPicker open={pick} onClose={() => setPick(false)} onPick={([m]) => { if (m) { set({ imageMediaId: m.id }); setPicked(m.url); } }} />
          </Card>
        </div>
      </fieldset>
    </>
  );
}
