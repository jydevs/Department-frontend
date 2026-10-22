"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/admin/utils";

export function DragHandle({ label = "Arrastrar para reordenar", className, ...rest }: { label?: string; className?: string } & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-drag-handle
      className={cn("flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-text active:cursor-grabbing", className)}
      {...rest}
    >
      <GripVertical aria-hidden size={16} />
    </button>
  );
}

interface RowProps {
  id: string;
  className?: string;
  children: (handle: ReactNode, state: { dragging: boolean }) => ReactNode;
}

export function SortableRow({ id, className, children }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "relative opacity-90 shadow-lg", className)}>
      {children(<DragHandle ref={setActivatorNodeRef} {...attributes} {...listeners} />, { dragging: isDragging })}
    </li>
  );
}

interface ListProps {
  ids: string[];
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/** Lista vertical ordenable por arrastre (ratón, táctil y teclado). */
export function SortableList({ ids, onReorder, children, className, "aria-label": ariaLabel }: ListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dndId = useId();
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  };
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className} aria-label={ariaLabel}>
          {children}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export { arrayMove };
