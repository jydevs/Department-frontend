"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeftToLine, ArrowRightToLine, ArrowUp, Trash2 } from "lucide-react";
import { IconButton, Input, Select } from "@/components/admin/ui";
import type { MenuItemData, MenuLink } from "@/lib/admin/api/content";
import { cn } from "@/lib/admin/utils";
import { HANDLE_RE, clone, linkError } from "./content-utils";
import { RefField } from "./fields";
import { DragHandle } from "./sortable";

export const MENU_MAX_ITEMS = 50;
const MAX_DEPTH_INDEX = 2; // niveles 0, 1 y 2 = 3 niveles
const INDENT = 28;

/* ------------------------------------------------------------------ */
/* Árbol <-> lista plana                                               */
/* ------------------------------------------------------------------ */

interface Flat {
  id: string;
  parentId: string | null;
  depth: number;
  item: MenuItemData;
}

function flatten(items: MenuItemData[], parentId: string | null = null, depth = 0, out: Flat[] = []): Flat[] {
  for (const item of items) {
    out.push({ id: item.id, parentId, depth, item: { ...item, children: undefined } });
    if (item.children?.length) flatten(item.children, item.id, depth + 1, out);
  }
  return out;
}

function buildTree(flat: Flat[]): MenuItemData[] {
  const nodes = new Map<string, MenuItemData>();
  for (const f of flat) nodes.set(f.id, { ...f.item, children: [] });
  const roots: MenuItemData[] = [];
  for (const f of flat) {
    const node = nodes.get(f.id)!;
    const parent = f.parentId ? nodes.get(f.parentId) : undefined;
    if (parent) parent.children!.push(node);
    else roots.push(node);
  }
  const prune = (list: MenuItemData[]) => {
    for (const n of list) {
      if (n.children && n.children.length === 0) delete n.children;
      else if (n.children) prune(n.children);
    }
  };
  prune(roots);
  return roots;
}

function descendantsOf(flat: Flat[], id: string): Flat[] {
  const out: Flat[] = [];
  const ids = new Set([id]);
  for (const f of flat) {
    if (f.parentId && ids.has(f.parentId)) {
      ids.add(f.id);
      out.push(f);
    }
  }
  return out;
}

function height(item: MenuItemData): number {
  return item.children?.length ? 1 + Math.max(...item.children.map(height)) : 0;
}

export function countItems(items: MenuItemData[]): number {
  return items.reduce((n, i) => n + 1 + countItems(i.children ?? []), 0);
}

/* ------------------------------------------------------------------ */
/* Operaciones sobre el árbol (sangrar / anular sangría / editar)       */
/* ------------------------------------------------------------------ */

interface Loc {
  siblings: MenuItemData[];
  index: number;
  parentSiblings: MenuItemData[] | null;
  parentIndex: number;
  depth: number;
}

function locate(items: MenuItemData[], id: string, parentSiblings: MenuItemData[] | null = null, parentIndex = -1, depth = 0): Loc | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return { siblings: items, index: i, parentSiblings, parentIndex, depth };
    if (items[i].children) {
      const r = locate(items[i].children!, id, items, i, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

export function indentItem(tree: MenuItemData[], id: string): MenuItemData[] | null {
  const next = clone(tree);
  const loc = locate(next, id);
  if (!loc || loc.index === 0) return null;
  const item = loc.siblings[loc.index];
  if (loc.depth + 1 + height(item) > MAX_DEPTH_INDEX) return null;
  const prev = loc.siblings[loc.index - 1];
  loc.siblings.splice(loc.index, 1);
  prev.children = [...(prev.children ?? []), item];
  return next;
}

export function outdentItem(tree: MenuItemData[], id: string): MenuItemData[] | null {
  const next = clone(tree);
  const loc = locate(next, id);
  if (!loc || !loc.parentSiblings) return null;
  const item = loc.siblings[loc.index];
  loc.siblings.splice(loc.index, 1);
  const parent = loc.parentSiblings[loc.parentIndex];
  if (parent.children?.length === 0) delete parent.children;
  loc.parentSiblings.splice(loc.parentIndex + 1, 0, item);
  return next;
}

/** Sube o baja un ítem entre sus hermanos (lleva consigo a sus hijos). */
export function moveSibling(tree: MenuItemData[], id: string, dir: -1 | 1): MenuItemData[] | null {
  const next = clone(tree);
  const loc = locate(next, id);
  if (!loc) return null;
  const to = loc.index + dir;
  if (to < 0 || to >= loc.siblings.length) return null;
  const [item] = loc.siblings.splice(loc.index, 1);
  loc.siblings.splice(to, 0, item);
  return next;
}

export function updateItem(tree: MenuItemData[], id: string, patch: Partial<MenuItemData>): MenuItemData[] {
  return tree.map((i) => (i.id === id ? { ...i, ...patch } : i.children ? { ...i, children: updateItem(i.children, id, patch) } : i));
}

export function removeItem(tree: MenuItemData[], id: string): MenuItemData[] {
  return tree
    .filter((i) => i.id !== id)
    .map((i) => {
      if (!i.children) return i;
      const children = removeItem(i.children, id);
      const { children: _drop, ...rest } = i;
      void _drop;
      return children.length ? { ...rest, children } : rest;
    });
}

/* ------------------------------------------------------------------ */
/* Validación local (mismo formato de rutas que el servidor)           */
/* ------------------------------------------------------------------ */

export function validateMenu(items: MenuItemData[], base = "items"): Record<string, string> {
  const errs: Record<string, string> = {};
  items.forEach((it, i) => {
    const p = `${base}.${i}`;
    if (!it.label.trim()) errs[`${p}.label`] = "La etiqueta es obligatoria";
    else if (it.label.length > 60) errs[`${p}.label`] = "Máximo 60 caracteres";
    if (it.link.type === "url") {
      const e = it.link.url ? linkError(it.link.url) : "Escribe una dirección";
      if (e) errs[`${p}.link.url`] = e;
    } else if (!it.link.handle || !HANDLE_RE.test(it.link.handle)) {
      errs[`${p}.link.handle`] = "Elige un elemento de la lista";
    }
    if (it.children) Object.assign(errs, validateMenu(it.children, `${p}.children`));
  });
  return errs;
}

function pathMap(items: MenuItemData[], base = "items", out = new Map<string, string>()): Map<string, string> {
  items.forEach((it, i) => {
    const p = `${base}.${i}`;
    out.set(it.id, p);
    if (it.children) pathMap(it.children, `${p}.children`, out);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  items: MenuItemData[];
  onChange: (items: MenuItemData[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export function MenuTree({ items, onChange, errors, disabled }: Props) {
  const flat = useMemo(() => flatten(items), [items]);
  const paths = useMemo(() => pathMap(items), [items]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const hidden = useMemo(() => (activeId ? new Set(descendantsOf(flat, activeId).map((d) => d.id)) : new Set<string>()), [activeId, flat]);
  const visible = useMemo(() => flat.filter((f) => !hidden.has(f.id)), [flat, hidden]);

  const projection = useMemo(() => {
    if (!activeId || !overId) return null;
    const activeIdx = visible.findIndex((f) => f.id === activeId);
    const overIdx = visible.findIndex((f) => f.id === overId);
    if (activeIdx < 0 || overIdx < 0) return null;
    const active = visible[activeIdx];
    const moved = arrayMove(visible, activeIdx, overIdx);
    const prev = moved[overIdx - 1];
    const next = moved[overIdx + 1];
    const projected = active.depth + Math.round(offsetX / INDENT);
    const subtreeHeight = Math.max(0, ...descendantsOf(flat, activeId).map((d) => d.depth - active.depth));
    const maxDepth = Math.min(prev ? prev.depth + 1 : 0, MAX_DEPTH_INDEX - subtreeHeight);
    const minDepth = next ? next.depth : 0;
    const depth = Math.max(0, Math.min(Math.max(projected, minDepth), maxDepth));
    let parentId: string | null = null;
    if (depth > 0 && prev) {
      if (depth === prev.depth) parentId = prev.parentId;
      else if (depth > prev.depth) parentId = prev.id;
      else parentId = moved.slice(0, overIdx).reverse().find((f) => f.depth === depth)?.parentId ?? null;
    }
    return { depth, parentId };
  }, [activeId, overId, offsetX, visible, flat]);

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  };
  const onDragMove = (e: DragMoveEvent) => setOffsetX(e.delta.x);
  const onDragOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const proj = projection;
    reset();
    if (!over || !proj) return;
    const full = flat.map((f) => ({ ...f }));
    const activeIdx = full.findIndex((f) => f.id === active.id);
    const overIdx = full.findIndex((f) => f.id === over.id);
    if (activeIdx < 0 || overIdx < 0) return;
    full[activeIdx] = { ...full[activeIdx], depth: proj.depth, parentId: proj.parentId };
    const sorted = arrayMove(full, activeIdx, overIdx);
    onChange(buildTree(sorted));
  };

  if (!items.length) return <p className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">Este menú no tiene ítems todavía. Añade el primero.</p>;

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={reset}>
      <SortableContext items={visible.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1.5" aria-label="Ítems del menú (arrastra para reordenar y anidar)" data-testid="menu-tree">
          {visible.map((f) => {
            const depth = f.id === activeId && projection ? projection.depth : f.depth;
            return (
              <MenuRow
                key={f.id}
                flat={f}
                depth={depth}
                path={paths.get(f.id) ?? ""}
                errors={errors}
                disabled={disabled}
                onUpdate={(patch) => onChange(updateItem(items, f.id, patch))}
                onRemove={() => onChange(removeItem(items, f.id))}
                onIndent={() => {
                  const r = indentItem(items, f.id);
                  if (r) onChange(r);
                }}
                onOutdent={() => {
                  const r = outdentItem(items, f.id);
                  if (r) onChange(r);
                }}
                canIndent={(() => {
                  const loc = locate(items, f.id);
                  return !!loc && loc.index > 0 && loc.depth + 1 + height(loc.siblings[loc.index]) <= MAX_DEPTH_INDEX;
                })()}
                canOutdent={f.depth > 0}
                onMove={(dir) => {
                  const r = moveSibling(items, f.id, dir);
                  if (r) onChange(r);
                }}
                canUp={(locate(items, f.id)?.index ?? 0) > 0}
                canDown={(() => {
                  const loc = locate(items, f.id);
                  return !!loc && loc.index < loc.siblings.length - 1;
                })()}
                dragging={f.id === activeId}
                childCount={f.id === activeId ? descendantsOf(flat, f.id).length : 0}
              />
            );
          })}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null} />
    </DndContext>
  );
}

const LINK_TYPES = [
  { value: "collection", label: "Colección" },
  { value: "product", label: "Producto" },
  { value: "page", label: "Página" },
  { value: "url", label: "URL" },
];

interface RowProps {
  flat: Flat;
  depth: number;
  path: string;
  errors: Record<string, string>;
  disabled?: boolean;
  dragging: boolean;
  childCount: number;
  canIndent: boolean;
  canOutdent: boolean;
  onUpdate: (patch: Partial<MenuItemData>) => void;
  onRemove: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onMove: (dir: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
}

function MenuRow({ flat, depth, path, errors, disabled, dragging, childCount, canIndent, canOutdent, onUpdate, onRemove, onIndent, onOutdent, onMove, canUp, canDown }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: flat.id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, marginLeft: depth * INDENT };
  const item = flat.item;
  const link = item.link;
  const errLabel = errors[`${path}.label`];
  const errTarget = errors[`${path}.link.handle`] ?? errors[`${path}.link.url`] ?? errors[`${path}.link`];

  const setType = (type: string) => {
    let next: MenuLink;
    if (type === "url") next = { type: "url", url: "/" };
    else next = { type: type as "collection" | "product" | "page", handle: "" };
    onUpdate({ link: next });
  };

  return (
    <li ref={setNodeRef} style={style} className={cn(dragging && "relative z-20 opacity-80")} data-testid="menu-row" data-item-id={flat.id}>
      <div className={cn("flex flex-wrap items-start gap-2 rounded-lg border bg-surface p-2", errLabel || errTarget ? "border-danger" : "border-border", dragging && "shadow-lg ring-1 ring-accent")}>
        {disabled ? null : (
          <div className="pt-1">
            <DragHandle ref={setActivatorNodeRef} label={`Arrastrar «${item.label}»`} {...attributes} {...listeners} />
          </div>
        )}
        <div className="order-3 grid min-w-0 basis-full gap-2 sm:order-none sm:flex-1 sm:basis-0 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1.3fr)] [&_label]:sr-only">
          <Input label="Etiqueta" value={item.label} maxLength={60} disabled={disabled} placeholder="Etiqueta del enlace" error={errLabel} onChange={(e) => onUpdate({ label: e.target.value })} />
          <Select label="Tipo de enlace" value={link.type} disabled={disabled} onChange={(e) => setType(e.target.value)} options={LINK_TYPES} />
          {link.type === "url" ? (
            <Input label="Dirección" value={link.url} disabled={disabled} placeholder="/ruta, https://… , mailto: o tel:" error={errTarget} onChange={(e) => onUpdate({ link: { type: "url", url: e.target.value.trim() } })} />
          ) : (
            <RefField label="Destino" kind={link.type} value={link.handle} disabled={disabled} error={errTarget} onChange={(v) => onUpdate({ link: { type: link.type as "collection" | "product" | "page", handle: v } })} />
          )}
        </div>
        {childCount > 0 ? <span className="mt-2 shrink-0 text-xs text-muted">+{childCount}</span> : null}
        {disabled ? null : (
          <div className="order-2 ml-auto flex shrink-0 items-center gap-0.5 pt-0.5 sm:order-none sm:ml-0">
            <IconButton label={`Subir «${item.label}»`} size="sm" icon={<ArrowUp aria-hidden size={14} />} disabled={!canUp} onClick={() => onMove(-1)} />
            <IconButton label={`Bajar «${item.label}»`} size="sm" icon={<ArrowDown aria-hidden size={14} />} disabled={!canDown} onClick={() => onMove(1)} />
            <IconButton label={`Anular sangría de «${item.label}»`} size="sm" icon={<ArrowLeftToLine aria-hidden size={14} />} disabled={!canOutdent} onClick={onOutdent} />
            <IconButton label={`Sangrar «${item.label}» (hacerlo hijo del anterior)`} size="sm" icon={<ArrowRightToLine aria-hidden size={14} />} disabled={!canIndent} onClick={onIndent} />
            <IconButton label={`Eliminar «${item.label}»`} size="sm" variant="danger" icon={<Trash2 aria-hidden size={14} />} onClick={onRemove} />
          </div>
        )}
      </div>
    </li>
  );
}
