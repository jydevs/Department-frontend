"use client";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Card } from "@/components/admin/ui/Display";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { SortableList } from "@/components/admin/ui/Sortable";
import { useSectionTypes, validateSections } from "@/lib/admin/api/content";
import { uid } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import type { ContentDoc, JsonValue, Section, SectionType } from "@/lib/admin/types";
import { PagePreview } from "./PagePreview";
import { PublishBar } from "./PublishBar";
import { SchemaForm } from "./SchemaForm";
import { useDraft } from "./useDraft";

const sectionsOf = (v: JsonValue): Section[] => ((v as { sections?: Section[] } | null)?.sections ?? []) as Section[];
const wrap = (sections: Section[]): JsonValue => ({ sections } as unknown as JsonValue);

/** Editor de secciones (plantillas y páginas): lista ordenable, formularios por esquema, vista previa y publicación. */
export function TemplateEditor({ doc, extra }: { doc: ContentDoc; extra?: React.ReactNode }) {
  const isPage = doc.kind === "page";
  const d = useDraft(doc, isPage);
  const types = useSectionTypes().data ?? [];
  const can = useCan("content:write");
  const confirm = useConfirm();
  const sections = sectionsOf(d.local);
  const [selId, setSelId] = useState<string | null>(sections[0]?.id ?? null);
  const [add, setAdd] = useState(false);
  const sel = sections.find((s) => s.id === selId) ?? null;
  const selType = types.find((t) => t.type === sel?.type);
  const errors = validateSections(sections, types);
  const setSections = (next: Section[]) => d.change(wrap(next));
  const patch = (id: string, p: Partial<Section>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const labelOf = (t: string) => types.find((x) => x.type === t)?.label ?? t;
  const secErrors = (id: string) => Object.keys(errors).filter((k) => k.startsWith(`${id}.`)).length;
  const addSection = (t: SectionType) => {
    const s: Section = { id: `s_${uid()}`, type: t.type, enabled: true, settings: Object.fromEntries(t.settings.filter((f) => f.type === "boolean" || f.type === "enum").map((f) => [f.key, f.type === "boolean" ? false : f.options?.[0] ?? ""])), blocks: t.blockTypes.length ? [] : undefined };
    setSections([...sections, s]); setSelId(s.id); setAdd(false);
  };
  const dup = (s: Section) => { const c: Section = { ...structuredClone(s), id: `s_${uid()}`, blocks: s.blocks?.map((b) => ({ ...structuredClone(b), id: `b_${uid()}` })) }; const i = sections.findIndex((x) => x.id === s.id); setSections([...sections.slice(0, i + 1), c, ...sections.slice(i + 1)]); setSelId(c.id); };
  const remove = async (s: Section) => { if (await confirm({ title: "Eliminar sección", message: `Se eliminará “${labelOf(s.type)}”.`, danger: true, confirmLabel: "Eliminar" })) { const next = sections.filter((x) => x.id !== s.id); setSections(next); if (selId === s.id) setSelId(next[0]?.id ?? null); } };
  return (
    <>
      <PublishBar doc={doc} local={d.local} dirty={d.dirty} saving={d.saving} invalidCount={Object.keys(errors).length} onSave={d.flush} onReset={d.reset} />
      {extra}
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr_26rem]">
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
                    <IconButton label={s.enabled ? "Desactivar" : "Activar"} className="size-7" onClick={() => patch(s.id, { enabled: !s.enabled })}>{s.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</IconButton>
                    <IconButton label="Duplicar" className="size-7" onClick={() => dup(s)}><Copy className="size-3.5" /></IconButton>
                    <IconButton label="Eliminar" className="size-7" onClick={() => void remove(s)}><Trash2 className="size-3.5" /></IconButton>
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
                    <div className="flex gap-1">{selType.blockTypes.map((bt) => <Button key={bt.type} size="sm" icon={<Plus className="size-3.5" />} disabled={!!selType.maxBlocks && (sel.blocks?.length ?? 0) >= selType.maxBlocks} onClick={() => patch(sel.id, { blocks: [...(sel.blocks ?? []), { id: `b_${uid()}`, type: bt.type, settings: {} }] })}>{bt.label}</Button>)}</div></div>
                  {errors[`${sel.id}.blocks`] && <p role="alert" className="mb-2 text-xs text-red-500">{errors[`${sel.id}.blocks`]}</p>}
                  <SortableList items={sel.blocks ?? []} getId={(b) => b.id} onChange={(blocks) => patch(sel.id, { blocks })}>
                    {(b, handle, i) => { const bt = selType.blockTypes.find((x) => x.type === b.type); return (
                      <details className="mb-2 rounded-sm border border-line" open={(sel.blocks?.length ?? 0) <= 3}>
                        <summary className="flex cursor-pointer items-center gap-1 p-2 text-sm">{handle}<span className="flex-1">{bt?.label} {i + 1}</span>
                          <IconButton label="Mover arriba" className="size-7" disabled={i === 0} onClick={(e) => { e.preventDefault(); const l = [...(sel.blocks ?? [])]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; patch(sel.id, { blocks: l }); }}><ChevronUp className="size-3.5" /></IconButton>
                          <IconButton label="Mover abajo" className="size-7" disabled={i === (sel.blocks?.length ?? 0) - 1} onClick={(e) => { e.preventDefault(); const l = [...(sel.blocks ?? [])]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; patch(sel.id, { blocks: l }); }}><ChevronDown className="size-3.5" /></IconButton>
                          <IconButton label="Eliminar bloque" className="size-7" onClick={(e) => { e.preventDefault(); patch(sel.id, { blocks: (sel.blocks ?? []).filter((x) => x.id !== b.id) }); }}><Trash2 className="size-3.5" /></IconButton></summary>
                        <div className="border-t border-line p-3">{bt && <SchemaForm fields={bt.fields} values={b.settings} onChange={(settings) => patch(sel.id, { blocks: (sel.blocks ?? []).map((x) => (x.id === b.id ? { ...x, settings } : x)) })} />}</div>
                      </details>); }}
                  </SortableList>
                </div>
              )}
            </fieldset>
          )}
        </Card>
        <Card title="Vista previa"><PagePreview sections={sections} /></Card>
      </div>
      <Dialog open={add} onClose={() => setAdd(false)} title="Añadir sección" size="lg">
        <ul className="grid gap-2 sm:grid-cols-2">{types.map((t) => <li key={t.type}><button type="button" onClick={() => addSection(t)} className="w-full rounded-sm border border-line p-3 text-left hover:border-accent"><p className="font-medium">{t.label}</p><p className="text-xs text-muted">{t.settings.length} campos{t.blockTypes.length ? ` · bloques: ${t.blockTypes.map((b) => b.label).join(", ")}` : ""}</p></button></li>)}</ul>
      </Dialog>
    </>
  );
}
