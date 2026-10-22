"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, IconButton, Input } from "@/components/admin/ui";
import { LIMITS } from "@/lib/admin/api/products";
import { cn } from "@/lib/admin/utils";
import { MediaPickerSlot, type MediaPickerItem } from "./media-picker-slot";
import { Thumb } from "./product-image";

export interface MediaDraft {
  key: string;
  url: string;
  alt: string;
  /** id del medio en la biblioteca (necesario para editar su texto alternativo). */
  id?: string;
  /** texto alternativo con el que se cargó (para saber si el usuario lo cambió). */
  baseAlt: string;
}

let seq = 0;
export function newMediaKey(): string {
  seq += 1;
  return `md${Date.now().toString(36)}${seq}`;
}

function SortableMedia({ item, index, count, onMove, onAlt, onRemove, readOnly, altLocked }: { item: MediaDraft; index: number; count: number; onMove: (dir: -1 | 1) => void; onAlt: (v: string) => void; onRemove: () => void; readOnly?: boolean; altLocked?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled: readOnly });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-2", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <div className="relative">
        <Thumb url={item.url} alt={item.alt} size={160} className="aspect-square !h-auto !w-full" rounded="rounded-md" />
        {index === 0 ? (
          <span className="absolute top-1.5 left-1.5">
            <Badge tone="accent">Principal</Badge>
          </span>
        ) : null}
        {!readOnly ? (
          <>
            <button
              type="button"
              ref={setActivatorNodeRef}
              aria-label={`Reordenar imagen ${index + 1}. Pulsa espacio y usa las flechas.`}
              className="absolute right-1.5 bottom-1.5 flex size-7 cursor-grab items-center justify-center rounded-md bg-surface/90 text-muted hover:text-text active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden size={16} />
            </button>
            <IconButton label={`Quitar imagen ${index + 1}`} size="sm" variant="secondary" className="absolute top-1.5 right-1.5 !size-7 bg-surface/90" icon={<X aria-hidden size={14} />} onClick={onRemove} />
            <span className="absolute bottom-1.5 left-1.5 flex gap-1">
              <IconButton label={`Mover imagen ${index + 1} a la izquierda`} size="sm" variant="secondary" className="!size-7 bg-surface/90" disabled={index === 0} icon={<ArrowLeft aria-hidden size={14} />} onClick={() => onMove(-1)} />
              <IconButton label={`Mover imagen ${index + 1} a la derecha`} size="sm" variant="secondary" className="!size-7 bg-surface/90" disabled={index === count - 1} icon={<ArrowRight aria-hidden size={14} />} onClick={() => onMove(1)} />
            </span>
          </>
        ) : null}
      </div>
      <Input
        aria-label={`Texto alternativo de la imagen ${index + 1}`}
        placeholder="Texto alternativo"
        value={item.alt}
        maxLength={255}
        disabled={readOnly || altLocked}
        title={altLocked ? "Necesitas el permiso media:write para editar el texto alternativo" : undefined}
        onChange={(e) => onAlt(e.target.value)}
      />
    </li>
  );
}

interface Props {
  items: MediaDraft[];
  onChange: (items: MediaDraft[]) => void;
  readOnly?: boolean;
  /** false si el usuario no puede editar el texto alternativo (requiere media:write). */
  canEditAlt?: boolean;
  error?: string | null;
}

export function MediaCard({ items, onChange, readOnly, canEditAlt = true, error }: Props) {
  const [picking, setPicking] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.key === active.id);
    const to = items.findIndex((i) => i.key === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  };

  const add = (picked: MediaPickerItem[]) => {
    const existing = new Set(items.map((i) => i.url));
    const fresh = picked.filter((p) => !existing.has(p.url)).map((p) => ({ key: newMediaKey(), url: p.url, alt: p.alt ?? "", baseAlt: p.alt ?? "", id: p.id }));
    onChange([...items, ...fresh].slice(0, LIMITS.maxMedia));
    setPicking(false);
  };

  return (
    <Card
      title="Medios"
      description="La primera imagen es la principal. Arrastra para reordenar."
      actions={
        readOnly ? null : (
          <Button size="sm" leftIcon={<ImagePlus aria-hidden size={14} />} disabled={items.length >= LIMITS.maxMedia} onClick={() => setPicking(true)}>
            Añadir imágenes
          </Button>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<ImagePlus aria-hidden size={22} />}
          title="Sin imágenes"
          description="Sube o elige imágenes de la biblioteca."
          className="py-8"
          action={
            readOnly ? undefined : (
              <Button onClick={() => setPicking(true)}>Añadir imágenes</Button>
            )
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.key)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Imágenes del producto">
              {items.map((it, i) => (
                <SortableMedia
                  key={it.key}
                  item={it}
                  index={i}
                  count={items.length}
                  onMove={(d) => onChange(arrayMove(items, i, i + d))}
                  readOnly={readOnly}
                  altLocked={!canEditAlt && !!it.id}
                  onAlt={(v) => onChange(items.map((x) => (x.key === it.key ? { ...x, alt: v } : x)))}
                  onRemove={() => onChange(items.filter((x) => x.key !== it.key))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        {items.length}/{LIMITS.maxMedia} imágenes. El texto alternativo pertenece a la imagen de la biblioteca: cambiarlo lo actualiza en todos los sitios donde se use.
      </p>
      <MediaPickerSlot open={picking} onClose={() => setPicking(false)} onSelect={add} multiple />
    </Card>
  );
}
