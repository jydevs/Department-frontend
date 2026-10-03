"use client";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUnsavedGuard } from "@/components/admin/shell/useUnsavedGuard";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Card, PageHeader, StatusBadge, Tabs } from "@/components/admin/ui/Display";
import { Checkbox, Field, Input, MoneyInput, Select, TagInput, Textarea } from "@/components/admin/ui/Form";
import { Markdown } from "@/components/admin/ui/Markdown";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { generateVariants, useDeleteProduct, useDuplicateProduct, useProductFacets, useSaveProduct, useSetProductStatus } from "@/lib/admin/api/catalog";
import { useCan } from "@/lib/admin/permissions";
import type { Product } from "@/lib/admin/types";
import { SeoPreview } from "./SeoPreview";

export function ProductEditor({ initial }: { initial: Product }) {
  const router = useRouter();
  const confirm = useConfirm();
  const can = useCan("products:write");
  const [p, setP] = useState<Product>(initial);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [pick, setPick] = useState(false);
  const facets = useProductFacets().data;
  const save = useSaveProduct((s) => { setDirty(false); if (!initial.id) router.replace(`/admin/products/${s.id}`); });
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
      <PageHeader title={initial.id ? p.title || "Producto" : "Nuevo producto"} breadcrumbs={[{ label: "Productos", href: "/admin/products" }, { label: initial.id ? "Editar" : "Nuevo" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {initial.id && can && <>
            <Button onClick={() => dup.mutate(initial.id)} loading={dup.isPending}>Duplicar</Button>
            <Button loading={setStatus.isPending} onClick={() => { const next = initial.status === "archived" ? "draft" : "archived"; setStatus.mutate({ id: initial.id, status: next }, { onSuccess: () => setP((x) => ({ ...x, status: next })) }); }}>{initial.status === "archived" ? "Restaurar" : "Archivar"}</Button>
            <Button variant="danger" onClick={async () => { if (await confirm({ title: "Eliminar producto", message: `Se eliminará “${p.title}” de forma permanente.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(initial.id); }}>Eliminar</Button>
          </>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(p)}>{initial.id ? "Guardar" : "Crear producto"}</Button>}
        </>} />
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="space-y-3">
              <Input label="Título" value={p.title} error={titleErr} onChange={(e) => set({ title: e.target.value })} />
              <Field label="Descripción" hint="Admite Markdown: **negrita**, *cursiva*, listas con “- ”, enlaces.">
                <Tabs label="Modo de edición" tabs={[{ key: "edit", label: "Editar" }, { key: "preview", label: "Vista previa" }]} value={tab} onChange={setTab} />
                {tab === "edit" ? <Textarea aria-label="Descripción" rows={8} value={p.description} onChange={(e) => set({ description: e.target.value })} /> : <div className="min-h-32 rounded-sm border border-line p-3"><Markdown source={p.description || "_Sin descripción_"} /></div>}
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
            <MediaPicker open={pick} onClose={() => setPick(false)} multiple onPick={(items) => set({ images: [...p.images, ...items.map((m) => ({ id: `${m.id}-${p.images.length}`, url: m.url, alt: m.alt || m.name }))] })} />
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
                <thead className="text-xs text-muted"><tr><th scope="col" className="py-2 pr-2">Variante</th><th scope="col" className="px-1">Precio</th><th scope="col" className="px-1">Comparado</th><th scope="col" className="px-1">SKU</th><th scope="col" className="px-1">Peso (g)</th><th scope="col" className="px-1">Código</th><th scope="col" className="px-1">Stock</th><th scope="col" className="px-1">Seg.</th><th scope="col" className="px-1">Back.</th></tr></thead>
                <tbody>
                  {p.variants.map((v, i) => (
                    <tr key={v.id} className="border-t border-line align-top">
                      <th scope="row" className="py-2 pr-2 font-medium">{hasOptions ? v.title : "Predeterminado"}</th>
                      <td className="px-1 py-1.5"><MoneyInput value={v.price} onChange={(x) => setVariant(i, { price: x ?? 0 })} /></td>
                      <td className="px-1 py-1.5"><MoneyInput value={v.compareAt} onChange={(x) => setVariant(i, { compareAt: x })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`SKU ${v.title}`} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Peso ${v.title}`} type="number" min={0} value={v.weight ?? ""} onChange={(e) => setVariant(i, { weight: e.target.value ? Number(e.target.value) : undefined })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Código de barras ${v.title}`} value={v.barcode ?? ""} onChange={(e) => setVariant(i, { barcode: e.target.value })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Stock ${v.title}`} type="number" min={0} className="w-20" value={v.stock} disabled={!v.tracked} onChange={(e) => setVariant(i, { stock: Math.max(0, Number(e.target.value)) })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Seguir inventario ${v.title}`} checked={v.tracked} onChange={(e) => setVariant(i, { tracked: e.target.checked })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Permitir backorder ${v.title}`} checked={v.backorder} onChange={(e) => setVariant(i, { backorder: e.target.checked })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Posicionamiento en buscadores (SEO)">
            <div className="space-y-3">
              <SeoPreview title={p.seoTitle || p.title} description={p.seoDescription} handle={p.handle} />
              <Input label="Título SEO" value={p.seoTitle} maxLength={70} onChange={(e) => set({ seoTitle: e.target.value })} />
              <Textarea label="Descripción SEO" rows={2} maxLength={320} value={p.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
              <Input label="Handle (URL)" value={p.handle} placeholder="se-genera-del-título" onChange={(e) => set({ handle: e.target.value })} />
            </div>
          </Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...p.metafields, { key: "", value: "" }] })}>Añadir</Button>}>
            {p.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{p.metafields.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input aria-label="Clave" placeholder="material" value={m.key} onChange={(e) => set({ metafields: p.metafields.map((x, k) => (k === i ? { ...x, key: e.target.value } : x)) })} />
                <Input aria-label="Valor" value={m.value} onChange={(e) => set({ metafields: p.metafields.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) })} />
                <IconButton label="Quitar metafield" onClick={() => set({ metafields: p.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>
              </div>))}</div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Estado"><div className="space-y-3"><div><StatusBadge status={p.status} /></div><Select aria-label="Estado" value={p.status} onChange={(e) => set({ status: e.target.value as Product["status"] })}><option value="draft">Borrador</option><option value="active">Activo</option><option value="archived">Archivado</option></Select></div></Card>
          <Card title="Organización">
            <div className="space-y-3">
              <Input label="Proveedor" list="vendors" value={p.vendor} onChange={(e) => set({ vendor: e.target.value })} />
              <datalist id="vendors">{facets?.vendors.map((v) => <option key={v} value={v} />)}</datalist>
              <Input label="Tipo de producto" list="types" value={p.type} onChange={(e) => set({ type: e.target.value })} />
              <datalist id="types">{facets?.types.map((v) => <option key={v} value={v} />)}</datalist>
              <TagInput label="Etiquetas" value={p.tags} onChange={(tags) => set({ tags })} />
            </div>
          </Card>
        </div>
      </fieldset>
    </>
  );
}
