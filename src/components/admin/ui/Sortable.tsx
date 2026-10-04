"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export function SortableList<I>({ items, getId, onChange, children, grid }: { items: I[]; getId: (i: I) => string; /** `moved` indica qué elemento se movió y a qué índice (para llamar a un endpoint de reordenado incremental). */ onChange: (next: I[], moved: { id: string; from: number; to: number }) => void; children: (item: I, handle: ReactNode, index: number) => ReactNode; grid?: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map(getId);
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id)), to = ids.indexOf(String(e.over.id));
    onChange(arrayMove(items, from, to), { id: String(e.active.id), from, to });
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        {items.map((it, i) => <Row key={getId(it)} id={getId(it)}>{(h) => children(it, h, i)}</Row>)}
      </SortableContext>
    </DndContext>
  );
}
function Row({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" aria-label="Arrastrar para reordenar (o usa espacio y flechas)" className="-m-1 cursor-grab touch-none rounded p-2.5 text-muted hover:bg-surface2 active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="size-4" />
    </button>
  );
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined, position: "relative" }}>{children(handle)}</div>;
}
