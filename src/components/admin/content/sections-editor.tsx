"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronRight, Copy, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, EmptyState, ErrorState, IconButton, JsonView, Menu, Select, Skeleton, Switch, useConfirm, useToast } from "@/components/admin/ui";
import { api } from "@/lib/admin/api-client";
import { useSectionTypes, type BlockData, type SectionData, type SectionTypeDescriptor } from "@/lib/admin/api/content";
import type { MediaItem } from "@/lib/admin/api/media";
import type { Paged } from "@/lib/admin/query";
import { cn } from "@/lib/admin/utils";
import { FALLBACK_IMAGE, MAX_BLOCKS_FALLBACK, imageUrlError, STARTER_BLOCKS, buildDefaults, clone, errorsUnder, makeBlock, moveItem, sectionErrorCounts, sectionSummary, uid, type Obj } from "./content-utils";
import { SchemaForm } from "./schema-form";
import { SectionIcon, sectionMeta } from "./section-meta";
import { SortableList, SortableRow } from "./sortable";
import type { DocumentEditor } from "./use-document-editor";

const MAX_SECTIONS = 40;

function sectionsOf(data: Obj | null): SectionData[] {
  return data && Array.isArray(data.sections) ? (data.sections as SectionData[]) : [];
}

interface Props {
  editor: DocumentEditor;
  /** Slot opcional que se muestra sobre la lista (p. ej. aviso de plantilla). */
  className?: string;
}

/** Editor de secciones: lista ordenable + catálogo + formulario de la sección seleccionada (con sus blocks). */
export function SectionsEditor({ editor, className }: Props) {
  const types = useSectionTypes();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [seenErrors, setSeenErrors] = useState(editor.errors);

  const sections = sectionsOf(editor.data);
  const typeMap = useMemo(() => new Map((types.data ?? []).map((t) => [t.type, t])), [types.data]);
  const errorCounts = sectionErrorCounts(editor.errors);
  const disabled = !editor.canWrite;

  // al llegar errores del servidor, salta a la primera sección con error
  if (editor.errors !== seenErrors) {
    setSeenErrors(editor.errors);
    const first = [...errorCounts.keys()].sort((a, b) => a - b)[0];
    if (first !== undefined && sections[first]) setSelectedId(sections[first].id);
  }

  const selectedIndex = Math.max(0, sections.findIndex((s) => s.id === selectedId));
  const selected = sections[selectedIndex] as SectionData | undefined;

  const setSections = (next: SectionData[], clearErrors = true) => {
    editor.setData((d) => ({ ...d, sections: next }));
    if (clearErrors && Object.keys(editor.errors).length) editor.setErrors({});
  };

  const updateSection = (index: number, patch: Partial<SectionData>) => {
    editor.setData((d) => {
      const list = sectionsOf(d).map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...d, sections: list };
    });
    // al editar, se quitan los errores de esa sección (se vuelven a calcular al guardar)
    const prefix = `sections.${index}.`;
    if (Object.keys(editor.errors).some((k) => k.startsWith(prefix))) {
      editor.setErrors(Object.fromEntries(Object.entries(editor.errors).filter(([k]) => !k.startsWith(prefix))));
    }
  };

  const firstImage = async (): Promise<string> => {
    try {
      const res = await qc.fetchQuery({ queryKey: ["media", "first"], staleTime: 60_000, queryFn: () => api.get<Paged<MediaItem>>("/admin/media", { query: { pageSize: 20 } }) });
      return res.items.find((m) => !imageUrlError(m.url))?.url ?? FALLBACK_IMAGE;
    } catch {
      return FALLBACK_IMAGE;
    }
  };

  const addSection = async (t: SectionTypeDescriptor) => {
    if (sections.length >= MAX_SECTIONS) {
      toast.error(`Máximo ${MAX_SECTIONS} secciones por documento.`);
      return;
    }
    const image = await firstImage();
    const settings = buildDefaults(t.settingsSchema, image);
    const starter = STARTER_BLOCKS[t.type];
    const blockDef = starter ? t.blockTypes.find((b) => b.type === starter.type) : undefined;
    const blocks: BlockData[] | undefined = starter && blockDef ? Array.from({ length: starter.count }, (_, i) => makeBlock(t.type, blockDef.type, blockDef.schema, image, i)) : undefined;
    const section: SectionData = { id: uid(t.type), type: t.type, enabled: true, settings, ...(blocks ? { blocks } : {}) };
    const at = selected ? selectedIndex + 1 : sections.length;
    const next = [...sections.slice(0, at), section, ...sections.slice(at)];
    setSections(next);
    setSelectedId(section.id);
    setAdding(false);
    toast.success(`Sección «${t.label}» añadida. Edítala a la derecha.`);
  };

  const duplicate = (index: number) => {
    if (sections.length >= MAX_SECTIONS) {
      toast.error(`Máximo ${MAX_SECTIONS} secciones por documento.`);
      return;
    }
    const src = sections[index];
    const copy = clone(src);
    copy.id = uid(src.type);
    if (copy.blocks) copy.blocks = copy.blocks.map((b) => ({ ...b, id: uid(b.type) }));
    setSections([...sections.slice(0, index + 1), copy, ...sections.slice(index + 1)]);
    setSelectedId(copy.id);
  };

  const remove = async (index: number) => {
    const s = sections[index];
    const label = typeMap.get(s.type)?.label ?? s.type;
    const ok = await confirm({ title: `¿Eliminar la sección «${label}»?`, description: "Se quitará del borrador. Puedes recuperarla descartando los cambios antes de guardar o restaurando una versión.", confirmLabel: "Eliminar sección", tone: "danger" });
    if (!ok) return;
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
  };

  if (types.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (types.isError) return <ErrorState error={types.error} onRetry={() => void types.refetch()} />;

  return (
    <div className={cn("grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]", className)} data-testid="sections-editor">
      <aside className="flex min-w-0 flex-col gap-3" aria-label="Secciones">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px]">
            Secciones <span className="text-sm font-normal text-muted">({sections.length})</span>
          </h2>
          {!disabled ? (
            <Button size="sm" variant="primary" leftIcon={<Plus aria-hidden size={14} />} onClick={() => setAdding(true)}>
              Añadir sección
            </Button>
          ) : null}
        </div>
        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong">
            <EmptyState title="Sin secciones" description="Añade la primera sección para empezar a construir esta página." action={!disabled ? <Button variant="primary" onClick={() => setAdding(true)}>Añadir sección</Button> : undefined} />
          </div>
        ) : (
          <SortableList
            ids={sections.map((s) => s.id)}
            onReorder={(from, to) => {
              setSections(moveItem(sections, from, to));
            }}
            className="flex flex-col gap-1.5"
            aria-label="Lista de secciones (arrastra para reordenar)"
          >
            {sections.map((s, i) => {
              const t = typeMap.get(s.type);
              const active = s.id === selected?.id;
              const errs = errorCounts.get(i) ?? 0;
              return (
                <SortableRow key={s.id} id={s.id}>
                  {(handle) => (
                    <div
                      data-testid="section-row"
                      data-section-id={s.id}
                      className={cn("flex items-center gap-1.5 rounded-lg border bg-surface px-1.5 py-1.5", active ? "border-accent ring-1 ring-accent" : "border-border", !s.enabled && "opacity-70", errs > 0 && "border-danger")}
                    >
                      {disabled ? null : handle}
                      <button type="button" onClick={() => setSelectedId(s.id)} aria-current={active ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left">
                        <SectionIcon type={s.type} className={cn("shrink-0", active ? "text-accent-text" : "text-muted")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t?.label ?? s.type}</span>
                          <span className="block truncate text-xs text-muted">{sectionSummary(s) || sectionMeta(s.type).description}</span>
                        </span>
                        {errs > 0 ? (
                          <Badge tone="danger" className="shrink-0">
                            {errs}
                          </Badge>
                        ) : null}
                        {!t ? <Badge tone="warning">Desconocida</Badge> : null}
                      </button>
                      <Switch checked={s.enabled} disabled={disabled} onChange={(v) => updateSection(i, { enabled: v })} aria-label={`${s.enabled ? "Desactivar" : "Activar"} ${t?.label ?? s.type}`} />
                      {disabled ? null : (
                        <Menu
                          label={`Acciones de ${t?.label ?? s.type}`}
                          items={[
                            { label: "Subir", icon: <ArrowUp aria-hidden size={14} />, disabled: i === 0, onSelect: () => setSections(moveItem(sections, i, i - 1)) },
                            { label: "Bajar", icon: <ArrowDown aria-hidden size={14} />, disabled: i === sections.length - 1, onSelect: () => setSections(moveItem(sections, i, i + 1)) },
                            { label: "Duplicar", icon: <Copy aria-hidden size={14} />, onSelect: () => duplicate(i) },
                            { label: "Eliminar", icon: <Trash2 aria-hidden size={14} />, danger: true, onSelect: () => void remove(i) },
                          ]}
                        />
                      )}
                    </div>
                  )}
                </SortableRow>
              );
            })}
          </SortableList>
        )}
        {Object.keys(editor.errors).some((k) => !k.startsWith("sections.")) ? (
          <div role="alert" className="rounded-md border border-danger/50 bg-danger/10 p-2 text-xs text-danger">
            {Object.entries(editor.errors)
              .filter(([k]) => !k.startsWith("sections."))
              .map(([k, m]) => (
                <p key={k}>
                  {k}: {m}
                </p>
              ))}
          </div>
        ) : null}
      </aside>

      <div className="min-w-0">
        {selected ? (
          <SectionPanel
            key={selected.id}
            section={selected}
            index={selectedIndex}
            type={typeMap.get(selected.type)}
            errors={editor.errors}
            disabled={disabled}
            onChange={(patch) => updateSection(selectedIndex, patch)}
            onDuplicate={() => duplicate(selectedIndex)}
            onRemove={() => void remove(selectedIndex)}
            firstImage={firstImage}
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface">
            <EmptyState title="Selecciona una sección" description="Elige una sección de la lista para editar su contenido." />
          </div>
        )}
      </div>

      <AddSectionDialog open={adding} onClose={() => setAdding(false)} types={types.data ?? []} onPick={(t) => void addSection(t)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddSectionDialog({ open, onClose, types, onPick }: { open: boolean; onClose: () => void; types: SectionTypeDescriptor[]; onPick: (t: SectionTypeDescriptor) => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = types.filter((t) => !needle || t.label.toLowerCase().includes(needle) || t.type.includes(needle) || sectionMeta(t.type).description.toLowerCase().includes(needle));
  return (
    <Dialog open={open} onClose={onClose} size="xl" title="Añadir sección" description="Elige un tipo de sección. Se añade con contenido de ejemplo que podrás editar.">
      <div className="mb-3 flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3">
        <Search aria-hidden size={15} className="text-muted" />
        <input aria-label="Buscar tipo de sección" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: hero, banner, texto…" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted/80" />
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No hay tipos que coincidan.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="section-catalog">
          {list.map((t) => (
            <li key={t.type}>
              <button type="button" data-section-type={t.type} onClick={() => onPick(t)} className="flex h-full w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left transition hover:border-accent hover:bg-surface-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-accent-text">
                  <SectionIcon type={t.type} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted">{sectionMeta(t.type).description}</span>
                  <code className="mt-1 inline-block rounded bg-surface-3 px-1 text-[10px] text-muted">{t.type}</code>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function SectionPanel({
  section,
  index,
  type,
  errors,
  disabled,
  onChange,
  onDuplicate,
  onRemove,
  firstImage,
}: {
  section: SectionData;
  index: number;
  type: SectionTypeDescriptor | undefined;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (patch: Partial<SectionData>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  firstImage: () => Promise<string>;
}) {
  const base = `sections.${index}`;
  const blocks = section.blocks ?? [];
  const blockDefs = type?.blockTypes ?? [];
  const maxBlocks = MAX_BLOCKS_FALLBACK[section.type] ?? 50;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [newType, setNewType] = useState("");
  const confirm = useConfirm();
  const sectionErrors = errorsUnder(errors, base);
  const ownErrors = Object.entries(errors).filter(([k]) => k === base || k === `${base}.id` || k === `${base}.type` || k === `${base}.enabled` || k === `${base}.blocks`);

  const setBlocks = (next: BlockData[]) => onChange({ blocks: next.length || section.blocks ? next : undefined });

  const addBlock = async (blockType: string) => {
    const def = blockDefs.find((b) => b.type === blockType);
    if (!def || blocks.length >= maxBlocks) return;
    const image = await firstImage();
    const b = makeBlock(section.type, def.type, def.schema, image, blocks.length);
    setBlocks([...blocks, b]);
    setOpen((s) => new Set(s).add(b.id));
  };

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="rounded-lg border border-border bg-surface" data-testid="section-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-3 text-accent-text">
            <SectionIcon type={section.type} size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[15px]">{type?.label ?? section.type}</h2>
            <p className="truncate text-xs text-muted">{sectionMeta(section.type).description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={section.enabled} disabled={disabled} onChange={(v) => onChange({ enabled: v })} label="Visible en la tienda" />
          {!disabled ? (
            <>
              <IconButton label="Duplicar sección" icon={<Copy aria-hidden size={15} />} onClick={onDuplicate} />
              <IconButton label="Eliminar sección" variant="danger" icon={<Trash2 aria-hidden size={15} />} onClick={onRemove} />
            </>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-5 p-4">
        {sectionErrors > 0 ? (
          <div role="alert" className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger" data-testid="section-error-banner">
            Esta sección tiene {sectionErrors} error{sectionErrors === 1 ? "" : "es"} de validación. Revisa los campos marcados.
            {ownErrors.map(([k, m]) => (
              <p key={k} className="text-xs">
                {k.replace(`${base}.`, "")}: {m}
              </p>
            ))}
          </div>
        ) : null}

        {type ? (
          <SchemaForm schema={type.settingsSchema} value={section.settings} onChange={(v) => onChange({ settings: v })} errors={errors} path={`${base}.settings`} disabled={disabled} />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-warning">Este tipo de sección ya no existe en el catálogo del servidor; no se puede editar con formulario.</p>
            <JsonView value={section.settings} />
          </div>
        )}

        {blockDefs.length > 0 ? (
          <section aria-label="Elementos de la sección" className="flex flex-col gap-3 border-t border-border pt-4" data-testid="blocks-editor">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm">
                Elementos <span className="font-normal text-muted">({blocks.length}/{maxBlocks})</span>
              </h3>
              {!disabled && blocks.length < maxBlocks ? (
                blockDefs.length === 1 ? (
                  <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} onClick={() => void addBlock(blockDefs[0].type)}>
                    Añadir {blockDefs[0].label.toLowerCase()}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select aria-label="Tipo de elemento a añadir" value={newType || blockDefs[0].type} onChange={(e) => setNewType(e.target.value)} options={blockDefs.map((b) => ({ value: b.type, label: b.label }))} className="h-8 text-[13px]" />
                    <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} onClick={() => void addBlock(newType || blockDefs[0].type)}>
                      Añadir
                    </Button>
                  </div>
                )
              ) : null}
            </div>
            {blocks.length === 0 ? <p className="text-sm text-muted">Esta sección aún no tiene elementos.</p> : null}
            <SortableList ids={blocks.map((b) => b.id)} onReorder={(from, to) => setBlocks(moveItem(blocks, from, to))} className="flex flex-col gap-2" aria-label="Elementos (arrastra para reordenar)">
              {blocks.map((b, j) => {
                const def = blockDefs.find((d) => d.type === b.type);
                const isOpen = open.has(b.id) || errorsUnder(errors, `${base}.blocks.${j}`) > 0;
                const errs = errorsUnder(errors, `${base}.blocks.${j}`);
                const summary = Object.values(b.settings).find((v): v is string => typeof v === "string" && v.trim() !== "" && !v.startsWith("/") && !v.startsWith("http")) ?? "";
                return (
                  <SortableRow key={b.id} id={b.id}>
                    {(handle) => (
                      <div className={cn("rounded-lg border bg-surface-2/40", errs ? "border-danger" : "border-border")} data-testid="block-row">
                        <div className="flex items-center gap-1.5 px-1.5 py-1.5">
                          {disabled ? null : handle}
                          <button type="button" aria-expanded={isOpen} onClick={() => toggle(b.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm">
                            <ChevronRight aria-hidden size={14} className={cn("shrink-0 transition-transform", isOpen && "rotate-90")} />
                            <span className="font-medium">{def?.label ?? b.type}</span>
                            <span className="truncate text-xs text-muted">{summary.slice(0, 50)}</span>
                            {errs ? <Badge tone="danger">{errs}</Badge> : null}
                          </button>
                          {disabled ? null : (
                            <>
                              <IconButton label={`Subir ${def?.label ?? "elemento"} ${j + 1}`} size="sm" icon={<ArrowUp aria-hidden size={14} />} disabled={j === 0} onClick={() => setBlocks(moveItem(blocks, j, j - 1))} />
                              <IconButton label={`Bajar ${def?.label ?? "elemento"} ${j + 1}`} size="sm" icon={<ArrowDown aria-hidden size={14} />} disabled={j === blocks.length - 1} onClick={() => setBlocks(moveItem(blocks, j, j + 1))} />
                            </>
                          )}
                          {disabled ? null : (
                            <IconButton
                              label={`Eliminar ${def?.label ?? "elemento"} ${j + 1}`}
                              size="sm"
                              icon={<Trash2 aria-hidden size={14} />}
                              onClick={async () => {
                                if (await confirm({ title: "¿Eliminar este elemento?", confirmLabel: "Eliminar", tone: "danger" })) setBlocks(blocks.filter((x) => x.id !== b.id));
                              }}
                            />
                          )}
                        </div>
                        {isOpen ? (
                          <div className="border-t border-border p-3">
                            {def ? (
                              <SchemaForm schema={def.schema} value={b.settings} onChange={(v) => setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, settings: v } : x)))} errors={errors} path={`${base}.blocks.${j}.settings`} disabled={disabled} />
                            ) : (
                              <JsonView value={b.settings} />
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SortableRow>
                );
              })}
            </SortableList>
          </section>
        ) : null}
      </div>
    </div>
  );
}
