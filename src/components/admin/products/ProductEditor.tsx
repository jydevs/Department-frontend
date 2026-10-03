"use client";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Card, PageHeader, StatusBadge, Tabs } from "@/components/admin/ui/Display";
import { Checkbox, Field, Input, Select, TagInput, Textarea } from "@/components/admin/ui/Form";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { formSig, generateVariants, mergeDraft, METAFIELD_TYPES, useDeleteProduct, useDuplicateProduct, useSaveProduct, useSetProductStatus, validateProduct, type FieldErrors, type ProductForm as Product, type SaveOutcome } from "@/lib/admin/api/catalog";
import { useCan } from "@/lib/admin/permissions";
import { safeHref } from "@/lib/url";

import { SeoPreview } from "./SeoPreview";
import { useDirtyGuard } from "./useDirtyGuard";

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "EM", "B", "I", "U", "UL", "OL", "LI", "H2", "H3", "H4", "BLOCKQUOTE", "A", "IMG"]);
/** Elementos que se descartan CON su contenido (el resto de etiquetas no permitidas se "desenvuelven" y queda su texto). */
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "BASE", "FORM", "SVG", "MATH", "TEMPLATE", "NOSCRIPT", "TITLE", "HEAD", "FRAME", "FRAMESET", "APPLET", "AUDIO", "VIDEO", "CANVAS", "TEXTAREA", "SELECT", "INPUT", "BUTTON"]);
const allowedLink = (v: string): boolean => /^(mailto|tel):[^\u0000-\u0020\u007f\\]+$/i.test(v) || safeHref(v) !== null;

/** Copia SOLO lo permitido a un árbol nuevo: no se conserva ningún atributo fuera de href/src/alt/title y las URLs se validan enteras. */
function cleanInto(from: Node, to: Node, doc: Document): void {
  from.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) { to.appendChild(doc.createTextNode(n.textContent ?? "")); return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    const tag = el.tagName.toUpperCase();
    if (DROP_TAGS.has(tag) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
    if (!ALLOWED_TAGS.has(tag)) { cleanInto(el, to, doc); return; }
    const out = doc.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = el.getAttribute("href") ?? "";
      if (allowedLink(href)) { out.setAttribute("href", href); out.setAttribute("rel", "noopener noreferrer nofollow"); out.setAttribute("target", "_blank"); }
    } else if (tag === "IMG") {
      const src = el.getAttribute("src") ?? "";
      if (safeHref(src) === null) return;
      out.setAttribute("src", src);
      out.setAttribute("alt", el.getAttribute("alt") ?? "");
    }
    if (tag !== "IMG" && tag !== "BR") cleanInto(el, out, doc);
    to.appendChild(out);
  });
}

/**
 * Vista previa del HTML de la descripción. Doble barrera: (1) lista blanca estricta (análisis en un <template> inerte) y
 * (2) el resultado se muestra en un iframe `sandbox=""` (sin scripts, origen opaco) con CSP propia. El servidor sanea de nuevo al guardar.
 */
function descriptionSrcDoc(html: string): string {
  // <template> es inerte: no carga imágenes ni ejecuta nada (ni aplica <base>) mientras se analiza
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const doc = document.implementation.createHTMLDocument("");
  cleanInto(tpl.content, doc.body, doc);
  const body = doc.body.innerHTML.trim() || "<em>Sin descripción</em>";
  const csp = `default-src 'none'; img-src https: ${window.location.origin}; style-src 'unsafe-inline'`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="color-scheme" content="light dark"><style>body{font:14px/1.5 system-ui,sans-serif;margin:12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}blockquote{margin:0 0 0 8px;padding-left:12px;border-left:3px solid #8884}</style></head><body>${body}</body></html>`;
}
const STATUS_LABEL = { draft: "Borrador", active: "Activo", archived: "Archivado" } as const;

/** Dinero en COP entero para celdas de tabla (sin etiqueta visible): marca el error con `aria-invalid` y apunta a la lista de errores. */
function MoneyCell({ value, onChange, label, bad, describedBy }: { value: number | undefined; onChange: (v: number | undefined) => void; label: string; bad: boolean; describedBy?: string }) {
  const [focused, setFocused] = useState(false);
  const [txt, setTxt] = useState("");
  const shown = focused ? txt : value === undefined ? "" : `$${new Intl.NumberFormat("es-CO").format(value)}`;
  return (
    <Input aria-label={label} aria-invalid={bad || undefined} aria-describedby={bad ? describedBy : undefined} className={bad ? "!border-accent" : undefined} inputMode="numeric" value={shown} placeholder="$0"
      onFocus={() => { setFocused(true); setTxt(value === undefined ? "" : String(value)); }}
      onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setTxt(d); onChange(d === "" ? undefined : Number(d)); }}
      onBlur={() => setFocused(false)} />
  );
}

export function ProductEditor({ initial }: { initial: Product }) {
  const router = useRouter();
  const confirm = useConfirm();
  const can = useCan("products:write");
  const [base, setBase] = useState<Product>(initial);
  const [p, setP] = useState<Product>(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [pick, setPick] = useState(false);
  const [serverErrs, setServerErrs] = useState<FieldErrors>({});
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);
  const isNew = !base.id;
  /** Hay cambios sin guardar si el borrador difiere de lo último guardado (no es un indicador que se "olvide" al fusionar). */
  const dirty = useMemo(() => formSig(p) !== formSig(base), [p, base]);
  const save = useSaveProduct({
    // lo que se tecleó mientras se guardaba se conserva; lo demás adopta el estado del servidor (ya saneado)
    onSaved: (s, v) => { setBase(s); setP((cur) => (formSig(cur) === formSig(v.draft) ? s : mergeDraft({ old: v.base ?? initial, cur, fresh: s, sent: v.draft }))); setServerErrs({}); setOutcome(null); if (!v.base) router.replace(`/admin/products/${s.id}`); },
    // fallo a medias: se conserva TODO lo tecleado, se fusiona solo lo ya persistido y se marca lo que falló
    onPartial: (o, v) => {
      if (o.fresh) { const fresh = o.fresh; setBase(fresh); setP((cur) => mergeDraft({ old: v.base ?? initial, cur, fresh, sent: v.draft, done: o.done })); }
      setServerErrs(o.fieldErrors); setOutcome(o);
      if (o.createdId) window.history.replaceState(null, "", `/admin/products/${o.createdId}`); // el producto ya existe: la URL pasa a ser la suya sin perder el borrador
    },
    confirmForce: (message) => confirm({ title: "Variantes afectadas", message, confirmLabel: "Continuar", danger: true }),
  });
  const issues = useMemo(() => validateProduct(p, isNew ? null : base), [p, base, isNew]);
  const errs = useMemo(() => { const m: FieldErrors = {}; if (dirty) for (const i of issues) m[i.path] ??= i.message; return { ...m, ...serverErrs }; }, [issues, dirty, serverErrs]);
  const blocked = dirty && issues.length > 0;
  const doSave = () => save.mutate({ draft: p, base: isNew ? null : base });
  const saveAndWait = async (): Promise<boolean> => { if (issues.length) return false; try { await save.mutateAsync({ draft: p, base: isNew ? null : base }); return true; } catch { return false; } };
  const nav = useDirtyGuard(dirty, saveAndWait);
  const dup = useDuplicateProduct((c) => router.push(`/admin/products/${c.id}`));
  const setStatus = useSetProductStatus();
  const del = useDeleteProduct(() => router.push("/admin/products"));
  const clearErr = (...paths: string[]) => setServerErrs((e) => (paths.some((k) => k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !paths.includes(k))) : e));
  const set = (patch: Partial<Product>) => { setP((x) => ({ ...x, ...patch })); clearErr(...Object.keys(patch)); };
  const setVariant = (i: number, patch: Partial<Product["variants"][number]>) => { const id = p.variants[i].id; set({ variants: p.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }); clearErr(`variants.${id}`, ...Object.keys(patch).map((k) => `variants.${id}.${k}`)); };
  const setOptions = (options: Product["options"]) => set({ options, variants: generateVariants(options, p.variants, p.variants[0]) });
  const hasOptions = p.options.length > 0;
  const variantErrors = [...p.variants.flatMap((v) => [errs[`variants.${v.id}.price`], errs[`variants.${v.id}.compareAt`], errs[`variants.${v.id}.sku`], errs[`variants.${v.id}.weight`], errs[`variants.${v.id}.barcode`], errs[`variants.${v.id}.title`], errs[`variants.${v.id}`]].filter(Boolean).map((m) => `${hasOptions ? v.title : "Predeterminado"}: ${m}`)), ...(errs.variants ? [errs.variants] : [])];
  const bad = (id: string, f: string) => !!errs[`variants.${id}.${f}`] || undefined;
  return (
    <>
      <PageHeader title={base.id ? p.title || "Producto" : "Nuevo producto"} breadcrumbs={[{ label: "Productos", href: "/admin/products" }, { label: base.id ? "Editar" : "Nuevo" }]}
        actions={<>
          {dirty && <span className="text-xs text-warn" role="status">Cambios sin guardar</span>}
          {base.id && can && <>
            <Button onClick={() => nav.guard(() => dup.mutate(base.id), { message: "Tienes cambios sin guardar. El duplicado se crea a partir de la versión guardada: guárdalos primero para que se incluyan o continúa sin ellos (se perderán al abrir el duplicado)." })} loading={dup.isPending}>Duplicar</Button>
            <Button loading={setStatus.isPending} disabled={dirty} onClick={() => { const next = base.status === "archived" ? "active" : "archived"; setStatus.mutate({ id: base.id, status: next }, { onSuccess: () => { setBase((x) => ({ ...x, status: next })); setP((x) => ({ ...x, status: next })); } }); }}>{base.status === "archived" ? "Publicar de nuevo" : "Archivar"}</Button>
            <Button variant="danger" onClick={() => nav.guard(async () => { if (await confirm({ title: "Eliminar producto", message: `Se eliminará “${p.title}”. Dejará de aparecer en la tienda y en las colecciones.`, danger: true, confirmLabel: "Eliminar" })) del.mutate(base.id); }, { allowSave: false, continueLabel: "Continuar", message: "Tienes cambios sin guardar. Si eliminas el producto se perderán junto con él." })}>Eliminar</Button>
          </>}
          {can && <Button variant="primary" loading={save.isPending} disabled={!dirty || blocked} onClick={doSave}>{base.id ? "Guardar" : "Crear producto"}</Button>}
        </>} />
      {blocked && can && <p role="status" className="mb-3 text-xs text-warn">Hay {issues.length} dato(s) por corregir antes de guardar: {issues.slice(0, 3).map((i) => i.message).join(" · ")}{issues.length > 3 ? "…" : ""}</p>}
      {outcome && (
        <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-accent/50 bg-accent/10 p-3 text-sm">
          <p className="min-w-0 flex-1 break-words">{outcome.message}. Tus cambios siguen en el formulario: {outcome.fresh ? "solo se reintentará lo pendiente." : "no se pudo recargar el estado del servidor."}</p>
          {can && <Button size="sm" variant="primary" loading={save.isPending} disabled={blocked} onClick={doSave}>Reintentar lo pendiente</Button>}
          <Button size="sm" variant="ghost" onClick={() => setOutcome(null)}>Ocultar aviso</Button>
        </div>
      )}
      {nav.dialog}
      <fieldset disabled={!can} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="space-y-3">
              <Input label="Título" value={p.title} error={errs.title} maxLength={255} onChange={(e) => set({ title: e.target.value })} />
              <Field label="Descripción" error={errs.description} hint="HTML básico: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;&lt;li&gt;, &lt;a href&gt;. El servidor elimina lo no permitido al guardar.">
                <Tabs label="Modo de edición" tabs={[{ key: "edit", label: "Editar" }, { key: "preview", label: "Vista previa" }]} value={tab} onChange={setTab} />
                {tab === "edit" ? <Textarea aria-label="Descripción" rows={8} value={p.description} onChange={(e) => set({ description: e.target.value })} /> : <iframe title="Vista previa de la descripción" sandbox="" srcDoc={descriptionSrcDoc(p.description)} className="h-72 w-full rounded-sm border border-line" />}
              </Field>
            </div>
          </Card>
          <Card title="Imágenes" actions={<Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => setPick(true)}>Añadir</Button>}>
            {p.images.length === 0 ? <p className="text-sm text-muted">Aún no hay imágenes. Se eligen desde la biblioteca de medios.</p> : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                <SortableList grid items={p.images} getId={(i) => i.id} onChange={(images) => set({ images })}>
                  {(img, handle, idx) => (
                    <div className="overflow-hidden rounded-sm border border-line bg-surface2">
                      <div className="relative aspect-[4/5] w-full"><Image src={img.url} alt={img.alt} fill sizes="160px" unoptimized loading={idx === 0 ? "eager" : "lazy"} className="object-cover" /></div>
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
                      <td className="px-1 py-1.5"><MoneyCell label={`Precio ${v.title}`} value={v.price} bad={!!bad(v.id, "price")} describedBy="pe-var-errors" onChange={(x) => setVariant(i, { price: x ?? 0 })} /></td>
                      <td className="px-1 py-1.5"><MoneyCell label={`Precio comparado ${v.title}`} value={v.compareAt} bad={!!bad(v.id, "compareAt")} describedBy="pe-var-errors" onChange={(x) => setVariant(i, { compareAt: x })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`SKU ${v.title}`} aria-invalid={bad(v.id, "sku")} aria-describedby={bad(v.id, "sku") ? "pe-var-errors" : undefined} className={bad(v.id, "sku") ? "!border-accent" : undefined} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Peso ${v.title}`} aria-invalid={bad(v.id, "weight")} aria-describedby={bad(v.id, "weight") ? "pe-var-errors" : undefined} className={bad(v.id, "weight") ? "!border-accent" : undefined} type="number" min={0} value={v.weight ?? ""} onChange={(e) => setVariant(i, { weight: e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : undefined })} /></td>
                      <td className="px-1 py-1.5"><Input aria-label={`Código de barras ${v.title}`} aria-invalid={bad(v.id, "barcode")} aria-describedby={bad(v.id, "barcode") ? "pe-var-errors" : undefined} className={bad(v.id, "barcode") ? "!border-accent" : undefined} value={v.barcode} onChange={(e) => setVariant(i, { barcode: e.target.value })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Seguir inventario ${v.title}`} checked={v.tracked} onChange={(e) => setVariant(i, { tracked: e.target.checked })} /></td>
                      <td className="px-1 py-2.5"><Checkbox aria-label={`Permitir backorder ${v.title}`} checked={v.backorder} onChange={(e) => setVariant(i, { backorder: e.target.checked })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {variantErrors.length > 0 && <ul id="pe-var-errors" role="alert" className="mt-2 list-inside list-disc space-y-0.5 text-xs text-accent-text">{variantErrors.map((m, k) => <li key={k}>{m}</li>)}</ul>}
            {errs.options && <p role="alert" className="mt-2 text-xs text-accent-text">{errs.options}</p>}
            <p className="mt-2 text-xs text-muted">El stock se gestiona en <Link href="/admin/inventory" className="underline">Inventario</Link>. Quitar un valor de opción desactiva las variantes que lo usan.</p>
          </Card>
          <Card title="Posicionamiento en buscadores (SEO)">
            <div className="space-y-3">
              <SeoPreview title={p.seoTitle || p.title} description={p.seoDescription} handle={p.handle} />
              <Input label="Título SEO" value={p.seoTitle} error={errs.seoTitle} maxLength={70} onChange={(e) => set({ seoTitle: e.target.value })} />
              <Textarea label="Descripción SEO" rows={2} maxLength={320} value={p.seoDescription} error={errs.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
              <Input label="Handle (URL)" value={p.handle} error={errs.handle} placeholder="se-genera-del-título" onChange={(e) => set({ handle: e.target.value })} />
            </div>
          </Card>
          <Card title="Metafields" actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => set({ metafields: [...p.metafields, { namespace: "custom", key: "", type: "single_line_text", value: "", saved: false }] })}>Añadir</Button>}>
            {p.metafields.length === 0 && <p className="text-sm text-muted">Sin metafields.</p>}
            <div className="space-y-2">{p.metafields.map((m, i) => {
              const upd = (patch: Partial<typeof m>) => set({ metafields: p.metafields.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid grid-cols-[6rem_1fr_7rem] gap-2 sm:grid-cols-[6rem_1fr_7rem_2fr_auto]">
                  <Input aria-label="Espacio de nombres" placeholder="custom" aria-invalid={!!errs[`metafields.${i}.namespace`] || undefined} value={m.namespace} disabled={m.saved} onChange={(e) => upd({ namespace: e.target.value })} />
                  <Input aria-label="Clave" placeholder="material" aria-invalid={!!errs[`metafields.${i}.key`] || undefined} value={m.key} disabled={m.saved} onChange={(e) => upd({ key: e.target.value })} />
                  <Select aria-label="Tipo" value={m.type} disabled={m.saved} onChange={(e) => upd({ type: e.target.value })}>{Object.entries(METAFIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Input aria-label="Valor" aria-invalid={!!errs[`metafields.${i}.value`] || undefined} className="col-span-3 sm:col-span-1" value={m.value} onChange={(e) => upd({ value: e.target.value })} />
                  {m.saved ? <span className="hidden sm:block sm:w-9" /> : <IconButton label="Quitar metafield" onClick={() => set({ metafields: p.metafields.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>}
                  {(["namespace", "key", "value"] as const).map((f) => errs[`metafields.${i}.${f}`] && <p key={f} role="alert" className="col-span-full text-xs text-accent-text">{f === "namespace" ? "Espacio de nombres" : f === "key" ? "Clave" : "Valor"}: {errs[`metafields.${i}.${f}`]}</p>)}
                </div>);
            })}</div>
            {p.metafields.some((m) => m.saved) && <p className="mt-2 text-xs text-muted">Los metafields guardados se pueden editar pero la API no permite eliminarlos.</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Estado"><div className="space-y-3"><div><StatusBadge status={p.status} /></div><Select aria-label="Estado" value={p.status} onChange={(e) => set({ status: e.target.value as Product["status"] })}>{(["draft", "active", "archived"] as const).filter((st) => st !== "draft" || base.status === "draft").map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}</Select>{errs.status ? <p role="alert" className="text-xs text-accent-text">{errs.status}</p> : p.status === "active" && base.status !== "active" && <p className="text-xs text-muted">Se publicará al guardar (requiere una variante activa con precio mayor a 0).</p>}</div></Card>
          <Card title="Organización">
            <div className="space-y-3">
              <Input label="Proveedor" value={p.vendor} error={errs.vendor} onChange={(e) => set({ vendor: e.target.value })} />
              <Input label="Tipo de producto" value={p.type} error={errs.type} onChange={(e) => set({ type: e.target.value })} />
              <TagInput label="Etiquetas" value={p.tags} onChange={(tags) => set({ tags })} />
            </div>
          </Card>
        </div>
      </fieldset>
    </>
  );
}
