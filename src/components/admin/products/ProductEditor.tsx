"use client";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useUnsavedGuard } from "@/components/admin/shell/useUnsavedGuard";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Card, PageHeader, StatusBadge, Tabs } from "@/components/admin/ui/Display";
import { Checkbox, Field, Input, MoneyInput, Select, TagInput, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { generateVariants, METAFIELD_TYPES, useDeleteProduct, useDuplicateProduct, useSaveProduct, useSetProductStatus, type ProductForm as Product } from "@/lib/admin/api/catalog";
import { useCan } from "@/lib/admin/permissions";

import { SeoPreview } from "./SeoPreview";

/** Vista previa del HTML de la descripción: elimina scripts, manejadores de eventos y URLs peligrosas (el servidor sanea de nuevo al guardar). */
function safeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,form").forEach((n) => n.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*(javascript|data):/i.test(a.value))) el.removeAttribute(a.name);
  });
  return doc.body.innerHTML;
}
const STATUS_LABEL = { draft: "Borrador", active: "Activo", archived: "Archivado" } as const;

export function ProductEditor({ initial }: { initial: Product }) {
  const router = useRouter();
  const confirm = useConfirm();
  const can = useCan("products:write");
  const [base, setBase] = useState<Product>(initial);
  const [p, setP] = useState<Product>(initial);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [pick, setPick] = useState(false);
  const isNew = !base.id;
  const save = useSaveProduct({
    onSaved: (s) => { setBase(s); setP(s); setDirty(false); if (isNew) router.replace(`/admin/products/${s.id}`); },
    onReset: (s) => { setBase(s); setP(s); setDirty(false); },
    confirmForce: (message) => confirm({ title: "Variantes afectadas", message, confirmLabel: "Continuar", danger: true }),
  });
  const dup = useDuplicateProduct((c) => router.push(`/admin/products/${c.id}`));
  const setStatus = useSetProductStatus();
  const del = useDeleteProduct(() => router.push("/admin/products"));
  useUnsavedGuard(dirty);
  const set = (patch: Partial<Product>) => { setP((x) => ({ ...x, ...patch })); setDirty(true); };
  const titleErr = dirty && !p.title.trim() ? "El título es obligatorio" : undefined;
  const setVariant = (i: number, patch: Partial<Product["variants"][number]>) => set({ variants: p.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) });
  const setOptions = (options: Product["options"]) => set({ options, variants: generateVariants(options, p.variants, p.variants[0]) });
  const hasOptions = p.options.length > 0;
  return (
    <>
      <PageHeader title={base.id ? p.title || "Producto" : "Nuevo producto"} breadcrumbs={[{ label: "Productos", href: "/admin/products" }, { label: base.id ? "Editar" : "Nuevo" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {base.id && can && <>
            <Button onClick={() => dup.mutate(base.id)} loading={dup.isPending}>Duplicar</Button>
            <Button loading={setStatus.isPending} disabled={dirty} onClick={() => { const next = base.status === "archived" ? "active" : "archived"; setStatus.mutate({ id: base.id, status: next }, { onSuccess: () => { setBase((x) => ({ ...x, status: next })); setP((x) => ({ ...x, status: next })); } }); }}>{base.status === "archived" ? "Publicar de nuevo" : "Archivar"}</Button>
            <Button variant="danger" onClick={async () => { if (await confirm({ title: "Eliminar producto", message: `Se eliminará “${p.title}”. Dejará de aparecer en la tienda y en las colecciones.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(base.id); }}>Eliminar</Button>
          </>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate({ draft: p, base: isNew ? null : base })}>{base.id ? "Guardar" : "Crear producto"}</Button>}
        </>} />
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="space-y-3">
              <Input label="Título" value={p.title} error={titleErr} onChange={(e) => set({ title: e.target.value })} />
              <Field label="Descripción" hint="HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;&lt;li&gt;, &lt;a href&gt;. El servidor elimina lo no permitido al guardar.">
                <Tabs label="Modo de edición" tabs={[{ key: "edit", label: "Editar" }, { key: "preview", label: "Vista previa" }]} value={tab} onChange={setTab} />
                {tab === "edit" ? <Textarea aria-label="Descripción" rows={8} value={p.description} onChange={(e) => set({ description: e.target.value })} /> : <div className="prose-sm min-h-32 rounded-sm border border-line p-3 text-sm" dangerouslySetInnerHTML={{ __html: p.description.trim() ? safeHtml(p.description) : "<em>Sin descripción</em>" }} />}
              </Field>
            </div>
          </Card>
          <Card title="Imágenes" actions={<Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => setPick(true)}>Añadir</Button>}>
            {p.images.length === 0 ? <p className="text-sm text-muted">Aún no hay imágenes. Se eligen desde la biblioteca de medios.</p> : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                <SortableList grid items={p.images} getId={(i) => i.id} onChange={(images) => set({ images })}>
                  {(img, handle, idx) => (
                    <div className="overflow-hidden rounded-sm border border-line bg-surface2">
                      <Image src={img.url} alt={img.alt} width={160} height={200} unoptimized className="aspect-[4/5] w-full object-cover" />
                      <div className="flex items-center justify-between px-1 py-0.5">{handle}{idx === 0 && <span className="text-[10px] text-muted">Principal</span>}<IconButton label="Quitar imagen" className="!size-9 xl:!size-7" onClick={() => set({ images: p.images.filter((i) => i.id !== img.id) })}><X className="size-3.5" /></IconButton></div>
                    </div>
                  )}
                </SortableList>
              </div>
            )}
            <MediaPicker open={pick} onClose={() => setPick(false)} multiple onPick={(items) => set({ images: [...p.images, ...items.filter((m) => !p.images.some((i) => i.url === m.url)).map((m) => ({ id: m.id, url: m.url, alt: m.alt || m.name }))] })} />
          </Card>
          <Card title="Opciones y variantes">
            <div className="space-y-3">
              {p.options.map((o, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
                  <Input aria-label="Nombre de la opción" placeholder="Talla" value={o.name} onChange={(e) => setOptions(p.options.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                  <TagInput value={o.values} onChange={(values) => setOptions(p.options.map((x, k) => (k === i ? { ...x, values } : x)))} placeholder="Valores (S, M, L…)" />
                  <IconButton label="Quitar opción" onClick={() => setOptions(p.options.filter((_, k) => k !== i))}><Trash2 className="size-4" /></IconButton>
                </div>
              ))}
              {p.options.length < 3 && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOptions([...p.options, { name: "", values: [] }])}>Añadir opción</Button>}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Variantes del producto</caption>
                <thead className="text-xs text-muted"><tr><th scope="col" className="py-2 pr-2">Variante</th><th scope="col" className="px-1">Precio</th><th scope="col" className="px-1">Comparado</th><th scope="col" className="px-1">SKU</th><th scope="col" className="px-1">Peso (g)</th><th scope="col" className="px-1">Código</th><th scope="col" className="px-1">Seg.</th><th scope="col" className="px-1">Back.</th></tr></thead>
                <tbody>
                  {p.variants.map((v, i) => (
                    <tr key={v.id} className="border-t border-line align-top">
                      <th scope="row" className="py-2 pr-2 font-medium">{hasOptions ? v.title : "Predeterminado"}</th>
                      <td className="px-1 py-1.5"><MoneyInput value={v.price} onChange={(x) => setVariant(i, { price: x ?? 0 })} /></td>
                      <td className="px-1 py-1.5"><MoneyInput value={v.compareAt} onChange={(x) => setVariant(i, { compareAt: x })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`SKU ${v.title}`} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Peso ${v.title}`} type="number" min={0} value={v.weight ?? ""} onChange={(e) => setVariant(i, { weight: e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : undefined })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Código de barras ${v.title}`} value={v.barcode} onChange={(e) => setVariant(i, { barcode: e.target.value })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Seguir inventario ${v.title}`} checked={v.tracked} onChange={(e) => setVariant(i, { tracked: e.target.checked })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Permitir backorder ${v.title}`} checked={v.backorder} onChange={(e) => setVariant(i, { backorder: e.target.checked })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">El stock se gestiona en <Link href="/admin/inventory" className="underline">Inventario</Link>. Quitar un valor de opción desactiva las variantes que lo usan.</p>
          </Card>
          <Card title="Posicionamiento en buscadores (SEO)">
            <div className="space-y-3">
              <SeoPreview title={p.seoTitle || p.title} description={p.seoDescription} handle={p.handle} />
              <Input label="Título SEO" value={p.seoTitle} maxLength={70} onChange={(e) => set({ seoTitle: e.target.value })} />
              <Textarea label="Descripción SEO" rows={2} maxLength={320} value={p.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
              <Input label="Handle (URL)" value={p.handle} placeholder="se-genera-del-título" onChange={(e) => set({ handle: e.target.value })} />
            </div>
          </Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...p.metafields, { namespace: "custom", key: "", type: "single_line_text", value: "", saved: false }] })}>Añadir</Button>}>
            {p.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{p.metafields.map((m, i) => {
              const upd = (patch: Partial<typeof m>) => set({ metafields: p.metafields.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid grid-cols-[6rem_1fr_7rem] gap-2 sm:grid-cols-[6rem_1fr_7rem_2fr_auto]">
                  <Input aria-label="Espacio de nombres" placeholder="custom" value={m.namespace} disabled={m.saved} onChange={(e) => upd({ namespace: e.target.value })} />
                  <Input aria-label="Clave" placeholder="material" value={m.key} disabled={m.saved} onChange={(e) => upd({ key: e.target.value })} />
                  <Select aria-label="Tipo" value={m.type} disabled={m.saved} onChange={(e) => upd({ type: e.target.value })}>{Object.entries(METAFIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Input aria-label="Valor" className="col-span-3 sm:col-span-1" value={m.value} onChange={(e) => upd({ value: e.target.value })} />
                  {m.saved ? <span className="hidden sm:block sm:w-9" /> : <IconButton label="Quitar metafield" onClick={() => set({ metafields: p.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>}
                </div>);
            })}</div>
            {p.metafields.some((m) => m.saved) && <p className="mt-2 text-xs text-muted">Los metafields guardados se pueden editar pero la API no permite eliminarlos.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Estado"><div className="space-y-3"><div><StatusBadge status={p.status} /></div><Select aria-label="Estado" value={p.status} onChange={(e) => set({ status: e.target.value as Product["status"] })}>{(["draft", "active", "archived"] as const).filter((st) => st !== "draft" || base.status === "draft").map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}</Select>{p.status === "active" && base.status !== "active" && <p className="text-xs text-muted">Se publicará al guardar (requiere una variante activa con precio mayor a 0).</p>}</div></Card>
          <Card title="Organización">
            <div className="space-y-3">
              <Input label="Proveedor" value={p.vendor} onChange={(e) => set({ vendor: e.target.value })} />
              <Input label="Tipo de producto" value={p.type} onChange={(e) => set({ type: e.target.value })} />
              <TagInput label="Etiquetas" value={p.tags} onChange={(tags) => set({ tags })} />
            </div>
          </Card>
        </div>
      </fieldset>
    </>
  );
}
