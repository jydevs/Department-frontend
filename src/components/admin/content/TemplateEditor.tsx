"use client";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { SeoPreview } from "@/components/admin/products/SeoPreview";
import { Badge, Card, EmptyState, Skeleton } from "@/components/admin/ui/Display";
import { Input, Textarea } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { initialValues, nodeId, useSectionTypes, validateSections, type CmsDoc as ContentDoc, type CmsSectionType as SectionType, type JsonValue, type Section } from "@/lib/admin/api/content";
import { useCan } from "@/lib/admin/permissions";
import { PagePreview } from "./PagePreview";
import { PublishBar } from "./PublishBar";
import { SchemaForm } from "./SchemaForm";
import { useDraft } from "./useDraft";

/** Bloque colapsable: el encabezado es un <div> (no <summary>) para poder alojar botones accesibles. */
function BlockItem({ handle, title, defaultOpen, first, last, onUp, onDown, onRemove, children }: { handle: React.ReactNode; title: string; defaultOpen: boolean; first: boolean; last: boolean; onUp: () => void; onDown: () => void; onRemove: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="mb-2 rounded-sm border border-line">
      <div className="flex items-center gap-1 p-2 text-sm">
        {handle}
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="min-h-9 flex-1 text-left">{title}</button>
        <IconButton label="Mover arriba" className="!size-9 xl:!size-7" disabled={first} onClick={onUp}><ChevronUp className="size-3.5" /></IconButton>
        <IconButton label="Mover abajo" className="!size-9 xl:!size-7" disabled={last} onClick={onDown}><ChevronDown className="size-3.5" /></IconButton>
        <IconButton label="Eliminar bloque" className="!size-9 xl:!size-7" onClick={onRemove}><Trash2 className="size-3.5" /></IconButton>
      </div>
      {open && <div id={id} className="border-t border-line p-3">{children}</div>}
    </div>
  );
}

const sectionsOf = (v: JsonValue): Section[] => ((v as { sections?: Section[] } | null)?.sections ?? []) as Section[];
const wrap = (cur: JsonValue, sections: Section[]): JsonValue => ({ ...(cur as Record<string, JsonValue>), sections } as unknown as JsonValue);
const strOf = (v: JsonValue, k: string): string => { const x = (v as Record<string, JsonValue> | null)?.[k]; return typeof x === "string" ? x : ""; };

/** Editor de secciones (plantillas y páginas): lista ordenable, formularios por esquema, vista previa y publicación. */
export function TemplateEditor({ doc }: { doc: ContentDoc }) {
  const t = useSectionTypes();
  if (t.isLoading) return <Skeleton className="h-96" />;
  if (!t.data) return <EmptyState title="No se pudo cargar el catálogo de secciones" text="Recarga la página para reintentar." />;
  return <Editor doc={doc} types={t.data} />;
}

function Editor({ doc, types }: { doc: ContentDoc; types: SectionType[] }) {
  const isPage = doc.kind === "page";
  const countErrors = (v: JsonValue) => Object.keys(validateSections(sectionsOf(v), types)).length + (isPage && !strOf(v, "title").trim() ? 1 : 0);
  const d = useDraft(doc, countErrors);
  const can = useCan("content:write");
  const confirm = useConfirm();
  const sections = sectionsOf(d.local);
  const [selId, setSelId] = useState<string | null>(sections[0]?.id ?? null);
  const [add, setAdd] = useState(false);
  const sel = sections.find((s) => s.id === selId) ?? null;
  const selType = types.find((t) => t.type === sel?.type);
  const errors = validateSections(sections, types);
  const setSections = (next: Section[]) => d.change(wrap(d.local, next));
  const setField = (k: string, v: string) => d.change({ ...(d.local as Record<string, JsonValue>), [k]: v });
  const patch = (id: string, p: Partial<Section>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const labelOf = (t: string) => types.find((x) => x.type === t)?.label ?? t;
  const secErrors = (id: string) => Object.keys(errors).filter((k) => k.startsWith(`${id}.`)).length;
  const addSection = (t: SectionType) => {
    const s: Section = { id: nodeId("sec"), type: t.type, enabled: true, settings: initialValues(t.settings), blocks: t.blockTypes.length ? [] : undefined };
    setSections([...sections, s]); setSelId(s.id); setAdd(false);
  };
  const dup = (s: Section) => { const c: Section = { ...structuredClone(s), id: nodeId("sec"), blocks: s.blocks?.map((b) => ({ ...structuredClone(b), id: nodeId("blk") })) }; const i = sections.findIndex((x) => x.id === s.id); setSections([...sections.slice(0, i + 1), c, ...sections.slice(i + 1)]); setSelId(c.id); };
  const remove = async (s: Section) => { if (await confirm({ title: "Eliminar sección", message: `Se eliminará “${labelOf(s.type)}”.`, danger: true, confirmLabel: "Eliminar" })) { const next = sections.filter((x) => x.id !== s.id); setSections(next); if (selId === s.id) setSelId(next[0]?.id ?? null); } };
  return (
    <>
      <PublishBar doc={doc} local={d.local} dirty={d.dirty} saving={d.saving} invalidCount={countErrors(d.local)} conflict={d.conflict} issues={d.issues} onSave={() => d.flush()} onReset={d.reset} />
      {isPage && (
        <Card title="SEO de la página" className="mb-4"><div className="grid gap-3 lg:grid-cols-2">
          <fieldset disabled={!can} className="space-y-3">
            <Input label="Título de la página *" value={strOf(d.local, "title")} maxLength={255} error={strOf(d.local, "title").trim() ? undefined : "Obligatorio"} onChange={(e) => setField("title", e.target.value)} />
            <Input label="Título SEO" value={strOf(d.local, "seoTitle")} maxLength={255} onChange={(e) => setField("seoTitle", e.target.value)} />
            <Textarea label="Descripción SEO" rows={2} value={strOf(d.local, "seoDescription")} maxLength={320} onChange={(e) => setField("seoDescription", e.target.value)} />
          </fieldset>
          <SeoPreview title={strOf(d.local, "seoTitle") || strOf(d.local, "title")} description={strOf(d.local, "seoDescription")} handle={doc.key} base="daregulardept.com/pages" />
        </div></Card>
      )}
      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_minmax(0,30rem)]">
        <Card title="Secciones" pad={false} actions={can ? <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAdd(true)}>Añadir</Button> : undefined}>
          <div className="space-y-1 p-2">
            {sections.length === 0 && <p className="p-4 text-center text-sm text-muted">Sin secciones. Añade la primera.</p>}
            <SortableList items={sections} getId={(s) => s.id} onChange={setSections}>
              {(s, handle) => (
                <div className={clsx("mb-1 flex items-center gap-1 rounded-sm border p-1.5", selId === s.id ? "border-accent bg-accent/5" : "border-line")}>
                  {can && handle}
                  <button type="button" onClick={() => setSelId(s.id)} aria-current={selId === s.id} className={clsx("min-w-0 flex-1 truncate text-left text-sm", !s.enabled && "text-muted line-through")}>{labelOf(s.type)}</button>
                  {secErrors(s.id) > 0 && <Badge tone="danger">{secErrors(s.id)}</Badge>}
                  {can && <>
                    <IconButton label={s.enabled ? "Desactivar" : "Activar"} className="!size-9 xl:!size-7" onClick={() => patch(s.id, { enabled: !s.enabled })}>{s.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</IconButton>
                    <IconButton label="Duplicar" className="!size-9 xl:!size-7" onClick={() => dup(s)}><Copy className="size-3.5" /></IconButton>
                    <IconButton label="Eliminar" className="!size-9 xl:!size-7" onClick={() => void remove(s)}><Trash2 className="size-3.5" /></IconButton>
                  </>}
                </div>
              )}
            </SortableList>
          </div>
        </Card>
        <Card title={sel ? `Editar: ${labelOf(sel.type)}` : "Editor"}>
          {!sel || !selType ? <p className="text-sm text-muted">Selecciona una sección para editarla.</p> : (
            <fieldset disabled={!can} className="space-y-5">
              <SchemaForm key={sel.id} fields={selType.settings} values={sel.settings} errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(`${sel.id}.settings.`)).map(([k, v]) => [k.replace(`${sel.id}.settings.`, ""), v]))} onChange={(settings) => patch(sel.id, { settings })} />
              {selType.blockTypes.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Bloques ({sel.blocks?.length ?? 0}{selType.maxBlocks ? `/${selType.maxBlocks}` : ""})</h3>
                    <div className="flex gap-1">{selType.blockTypes.map((bt) => <Button key={bt.type} size="sm" icon={<Plus className="size-3.5" />} disabled={!!selType.maxBlocks && (sel.blocks?.length ?? 0) >= selType.maxBlocks} onClick={() => patch(sel.id, { blocks: [...(sel.blocks ?? []), { id: nodeId("blk"), type: bt.type, settings: initialValues(bt.fields) }] })}>{bt.label}</Button>)}</div></div>
                  {errors[`${sel.id}.blocks`] && <p role="alert" className="mb-2 text-xs text-accent-text">{errors[`${sel.id}.blocks`]}</p>}
                  <SortableList items={sel.blocks ?? []} getId={(b) => b.id} onChange={(blocks) => patch(sel.id, { blocks })}>
                    {(b, handle, i) => { const bt = selType.blockTypes.find((x) => x.type === b.type); const list = sel.blocks ?? []; return (
                      <BlockItem handle={handle} title={`${bt?.label ?? b.type} ${i + 1}`} defaultOpen={list.length <= 3} first={i === 0} last={i === list.length - 1}
                        onUp={() => { const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; patch(sel.id, { blocks: l }); }}
                        onDown={() => { const l = [...list]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; patch(sel.id, { blocks: l }); }}
                        onRemove={() => patch(sel.id, { blocks: list.filter((x) => x.id !== b.id) })}>
                        {bt && <SchemaForm fields={bt.fields} values={b.settings} errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(`${sel.id}.blocks.${b.id}.`)).map(([k, v]) => [k.replace(`${sel.id}.blocks.${b.id}.`, ""), v]))} onChange={(settings) => patch(sel.id, { blocks: list.map((x) => (x.id === b.id ? { ...x, settings } : x)) })} />}
                      </BlockItem>); }}
                  </SortableList>
                </div>
              )}
            </fieldset>
          )}
        </Card>
        <Card title="Vista previa de la tienda"><PagePreview doc={doc} savedAt={d.savedAt} /></Card>
      </div>
      <Dialog open={add} onClose={() => setAdd(false)} title="Añadir sección" size="lg">
        <ul className="grid gap-2 sm:grid-cols-2">{types.map((t) => <li key={t.type}><button type="button" onClick={() => addSection(t)} className="w-full rounded-sm border border-line p-3 text-left hover:border-accent"><p className="font-medium">{t.label}</p><p className="text-xs text-muted">{t.settings.length} campos{t.blockTypes.length ? ` · bloques: ${t.blockTypes.map((b) => b.label).join(", ")}` : ""}</p></button></li>)}</ul>
      </Dialog>
    </>
  );
}
