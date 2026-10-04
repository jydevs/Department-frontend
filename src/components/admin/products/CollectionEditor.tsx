"use client";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Card, PageHeader, Spinner } from "@/components/admin/ui/Display";
import { Input, Select, Switch, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { RULE_OPS, rulesReady, useDeleteCollection, usePreviewRules, useSaveCollection, validateCollection, type CollectionForm as Collection, type Rule } from "@/lib/admin/api/catalog";
import { useMediaUrls } from "@/lib/admin/api/media";
import { errorMessage } from "@/lib/admin/errors";
import { CollectionMembers } from "./CollectionMembers";
import { useCan } from "@/lib/admin/permissions";
import { SeoPreview } from "./SeoPreview";
import { useDirtyGuard } from "./useDirtyGuard";

const FIELDS: Record<Rule["field"], string> = { tag: "Etiqueta", type: "Tipo", vendor: "Proveedor", price: "Precio (COP)" };
const OPS: Record<Rule["op"], string> = { eq: "es igual a", neq: "no es igual a", contains: "contiene", gt: "mayor que", lt: "menor que" };
const sig = (c: Collection): string => JSON.stringify([c.handle, c.title, c.description, c.kind, c.published, c.rules, c.match, c.sort, c.imageMediaId, c.seoTitle, c.seoDescription, c.metafields.map((m) => [m.namespace, m.key, m.type, m.value])]);

export function CollectionEditor({ initial }: { initial: Collection }) {
  const router = useRouter(), confirm = useConfirm(), can = useCan("collections:write");
  const [base, setBase] = useState(initial);
  const [c, setC] = useState(initial);
  const [pick, setPick] = useState(false);
  const [picked, setPicked] = useState("");
  const isNew = !base.id;
  const dirty = useMemo(() => sig(c) !== sig(base), [c, base]);
  const imageUrl = useMediaUrls([c.imageMediaId]);
  const image = c.imageMediaId ? imageUrl.data?.get(c.imageMediaId) ?? picked : undefined;
  const save = useSaveCollection({
    onSaved: (s) => { setBase(s); setC(s); setPicked(""); if (isNew) router.replace(`/admin/collections/${s.id}`); },
    // la colección ya existe pero faltó algo (productos/metafields): se conserva el borrador y la URL pasa a ser la suya
    onFail: (id) => { setBase((b) => ({ ...b, id })); setC((x) => ({ ...x, id })); window.history.replaceState(null, "", `/admin/collections/${id}`); },
  });
  const del = useDeleteCollection(() => router.push("/admin/collections"));
  const set = (p: Partial<Collection>) => setC((x) => ({ ...x, ...p }));
  const preview = usePreviewRules(c);
  const setRule = (i: number, patch: Partial<Rule>) => set({ rules: c.rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const issues = useMemo(() => validateCollection(c), [c]);
  const errs = useMemo(() => { const m: Record<string, string> = {}; if (dirty) for (const i of issues) m[i.path] ??= i.message; return m; }, [issues, dirty]);
  const blocked = dirty && issues.length > 0;
  const trySave = async (): Promise<boolean> => {
    if (blocked) return false;
    try { await save.mutateAsync({ draft: c, base: isNew ? null : base }); return true; } catch { return false; }
  };
  const nav = useDirtyGuard(dirty, trySave);
  return (
    <>
      <PageHeader title={base.id ? c.title || "Colección" : "Nueva colección"} breadcrumbs={[{ label: "Colecciones", href: "/admin/collections" }, { label: base.id ? "Editar" : "Nueva" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {base.id && can && <Button variant="danger" onClick={() => nav.guard(async () => { if (await confirm({ title: "Eliminar colección", message: "Los productos no se eliminan.", danger: true, confirmLabel: "Eliminar" })) del.mutate(base.id); }, { allowSave: false, continueLabel: "Continuar", message: "Tienes cambios sin guardar. Si eliminas la colección se perderán junto con ella." })}>Eliminar</Button>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty || blocked} onClick={() => void trySave()}>Guardar</Button>}
        </>} />
      {nav.dialog}
      {blocked && can && <p role="status" className="mb-3 text-xs text-warn">Hay {issues.length} dato(s) por corregir antes de guardar: {issues.slice(0, 3).map((i) => i.message).join(" · ")}{issues.length > 3 ? "…" : ""}</p>}
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><div className="space-y-3">
            <Input label="Título" value={c.title} maxLength={255} onChange={(e) => set({ title: e.target.value })} error={errs.title} />
            <Textarea label="Descripción (HTML básico)" value={c.description} onChange={(e) => set({ description: e.target.value })} />
          </div></Card>
          <Card title={c.kind === "manual" ? "Productos (orden manual)" : "Reglas de la colección"}>
            <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Tipo de colección">
              {(["manual", "smart"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={c.kind === k} onClick={() => set({ kind: k, ...(k === "smart" && c.rules.length === 0 ? { rules: [{ field: "tag", op: "eq", value: "" }] } : {}) })} className={`font-condensed min-h-10 border px-4 text-xs tracking-[0.12em] ${c.kind === k ? "border-fg bg-fg text-bg" : "border-fg/35 text-muted hover:text-fg"}`}>{k === "manual" ? "Manual" : "Inteligente"}</button>)}
            </div>
            {c.kind === "manual" ? (
              isNew || base.kind !== "manual" ? (
                <p role="status" className="rounded-sm border border-line bg-surface2 p-3 text-sm text-muted">{isNew ? "Guarda la colección para poder añadir productos." : "Guarda el cambio de tipo (de inteligente a manual) para poder añadir productos a mano."}</p>
              ) : (
                <CollectionMembers collectionId={base.id} sortManual={c.sort === "manual"} canWrite={can} />
              )
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">Los productos deben cumplir <Select aria-label="Coincidir con" className="w-28" value={c.match} onChange={(e) => set({ match: e.target.value as Collection["match"] })}><option value="all">todas</option><option value="any">alguna</option></Select> de estas reglas:</div>
                {errs.rules && <p role="alert" className="text-xs text-accent-text">{errs.rules}</p>}
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
            <Input label="Título SEO" value={c.seoTitle} maxLength={255} error={errs.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} /><Textarea label="Descripción SEO" rows={2} value={c.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
            <Input label="Handle (URL)" value={c.handle} error={errs.handle} onChange={(e) => set({ handle: e.target.value })} />
          </div></Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...c.metafields, { namespace: "custom", key: "", type: "single_line_text", value: "", saved: false }] })}>Añadir</Button>}>
            {c.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{c.metafields.map((m, i) => {
              const upd = (patch: Partial<typeof m>) => set({ metafields: c.metafields.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid grid-cols-[6rem_1fr_2fr_auto] gap-2">
                  <Input aria-label="Espacio de nombres" aria-invalid={!!errs[`metafields.${i}.namespace`] || undefined} value={m.namespace} disabled={m.saved} onChange={(e) => upd({ namespace: e.target.value })} />
                  <Input aria-label="Clave" aria-invalid={!!errs[`metafields.${i}.key`] || undefined} value={m.key} disabled={m.saved} onChange={(e) => upd({ key: e.target.value })} />
                  <Input aria-label="Valor" aria-invalid={!!errs[`metafields.${i}.value`] || undefined} value={m.value} onChange={(e) => upd({ value: e.target.value })} />
                  {m.saved ? <span className="w-9" /> : <IconButton label="Quitar" onClick={() => set({ metafields: c.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>}
                  {(["namespace", "key", "value"] as const).map((f) => errs[`metafields.${i}.${f}`] && <p key={f} role="alert" className="col-span-full text-xs text-accent-text">{f === "namespace" ? "Espacio de nombres" : f === "key" ? "Clave" : "Valor"}: {errs[`metafields.${i}.${f}`]}</p>)}
                </div>);
            })}</div>
            {c.metafields.some((m) => m.saved) && <p className="mt-2 text-xs text-muted">Los metafields guardados se pueden editar pero la API no permite eliminarlos.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Publicación"><label className="flex items-center justify-between text-sm">{c.published ? "Publicada" : "Oculta"}<Switch label="Publicada" checked={c.published} onChange={(v) => set({ published: v })} /></label></Card>
          <Card title="Orden de productos"><Select aria-label="Orden" value={c.sort} onChange={(e) => set({ sort: e.target.value as Collection["sort"] })}><option value="manual">Manual</option><option value="newest">Más nuevos</option><option value="price_asc">Precio: menor a mayor</option><option value="price_desc">Precio: mayor a menor</option><option value="title">Alfabético</option></Select></Card>
          <Card title="Imagen" actions={<Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => setPick(true)}>{c.imageMediaId ? "Cambiar" : "Elegir"}</Button>}>
            {image ? <div className="relative aspect-[8/5] w-full overflow-hidden rounded-sm"><Image src={image} alt="Imagen de la colección" fill sizes="320px" unoptimized loading="eager" className="object-cover" /></div> : c.imageMediaId && imageUrl.isLoading ? <Spinner /> : <p className="text-sm text-muted">{c.imageMediaId ? "Imagen elegida (no se pudo mostrar su vista previa)." : "Sin imagen."}</p>}
            <MediaPicker open={pick} onClose={() => setPick(false)} onPick={([m]) => { if (m) { set({ imageMediaId: m.id }); setPicked(m.url); } }} />
          </Card>
        </div>
      </fieldset>
    </>
  );
}
