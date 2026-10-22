"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, ErrorState, IconButton, SearchInput, Skeleton } from "@/components/admin/ui";
import { Thumb } from "@/components/admin/products/product-image";
import type { CollectionMember } from "@/lib/admin/api/collections";
import { useProductList } from "@/lib/admin/api/products";
import { formatCop } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { cn } from "@/lib/admin/utils";

function Row({ m, index, count, onMove, onRemove, readOnly }: { m: CollectionMember; index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove: () => void; readOnly?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: m.id, disabled: readOnly });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2", isDragging && "z-10 opacity-80 shadow-lg")}>
      {!readOnly ? (
        <button type="button" ref={setActivatorNodeRef} aria-label={`Reordenar ${m.title}. Pulsa espacio y usa las flechas.`} className="cursor-grab text-muted hover:text-text active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical aria-hidden size={16} />
        </button>
      ) : null}
      <span className="w-5 text-right text-xs text-muted tabular-nums">{index + 1}</span>
      <Thumb url={m.imageUrl} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{m.title}</span>
        <span className="block truncate text-xs text-muted">
          {m.status && m.status !== "active" ? `${m.status === "draft" ? "Borrador" : "Archivado"} · ` : ""}
          {m.price !== null ? formatCop(m.price) : `/${m.handle}`}
        </span>
      </span>
      {!readOnly ? <IconButton label={`Subir ${m.title}`} size="sm" disabled={index === 0} icon={<ArrowUp aria-hidden size={14} />} onClick={() => onMove(-1)} /> : null}
      {!readOnly ? <IconButton label={`Bajar ${m.title}`} size="sm" disabled={index === count - 1} icon={<ArrowDown aria-hidden size={14} />} onClick={() => onMove(1)} /> : null}
      {!readOnly ? <IconButton label={`Quitar ${m.title}`} size="sm" icon={<X aria-hidden size={14} />} onClick={onRemove} /> : null}
    </li>
  );
}

interface Props {
  members: CollectionMember[];
  onChange: (members: CollectionMember[]) => void;
  /** false: no se pudo leer la lista actual del servidor. */
  known: boolean;
  readOnly?: boolean;
  edited: boolean;
}

export function ManualProducts({ members, onChange, known, readOnly, edited }: Props) {
  const [q, setQ] = useState("");
  const canSearch = useCan("products:read");
  const search = useProductList({ q: q || undefined, pageSize: 8 }, canSearch);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const inList = new Set(members.map((m) => m.id));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = members.findIndex((m) => m.id === active.id);
    const to = members.findIndex((m) => m.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(members, from, to));
  };

  return (
    <Card title="Productos de la colección" description={`${members.length} producto${members.length === 1 ? "" : "s"} · arrastra para ordenar (el orden se aplica con «Orden: Manual»).`}>
      <div className="flex flex-col gap-5">
        {!known && !edited ? (
          <p role="status" className="rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">
            No se pudo leer la lista actual de productos de esta colección. Si añades o quitas productos y guardas, la lista guardada se reemplazará por la que veas aquí.
          </p>
        ) : null}

        {members.length === 0 ? (
          <EmptyState title="Sin productos" description="Busca productos abajo para añadirlos." className="py-6" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2" aria-label="Productos en la colección">
                {members.map((m, i) => (
                  <Row key={m.id} m={m} index={i} count={members.length} onMove={(d) => onChange(arrayMove(members, i, i + d))} readOnly={readOnly} onRemove={() => onChange(members.filter((x) => x.id !== m.id))} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {!readOnly && canSearch ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar productos para añadir…" label="Buscar productos para añadir" />
            {search.error ? (
              <ErrorState error={search.error} onRetry={() => search.refetch()} />
            ) : search.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="flex flex-col gap-1.5" aria-label="Resultados de búsqueda">
                {search.data?.items.length === 0 ? <li className="text-sm text-muted">Sin resultados.</li> : null}
                {search.data?.items.map((p) => {
                  const added = inList.has(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2">
                      <Thumb url={p.primaryImage?.url} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.title}
                        {p.status !== "active" ? <span className="ml-2 text-xs text-muted">({p.status === "draft" ? "borrador" : "archivado"})</span> : null}
                      </span>
                      <Button
                        size="sm"
                        disabled={added || members.length >= 1000}
                        leftIcon={<Plus aria-hidden size={13} />}
                        onClick={() => onChange([...members, { id: p.id, handle: p.handle, title: p.title, price: p.minPrice, imageUrl: p.primaryImage?.url ?? null, status: p.status }])}
                      >
                        {added ? "Añadido" : "Añadir"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
