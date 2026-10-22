"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import type { MediaItem } from "@/lib/admin/api/media";
import { MediaThumb } from "./media-parts";

interface MediaGridProps {
  items: MediaItem[];
  selected: ReadonlySet<string>;
  /** Clic en la miniatura. */
  onActivate: (item: MediaItem) => void;
  onDoubleActivate?: (item: MediaItem) => void;
  /** Casilla de selección independiente (biblioteca): si no se pasa, el clic en la miniatura selecciona. */
  onToggle?: (item: MediaItem) => void;
  highlightId?: string | null;
}

export function MediaGrid({ items, selected, onActivate, onDoubleActivate, onToggle, highlightId }: MediaGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="media-grid">
      {items.map((m) => {
        const isSel = selected.has(m.id);
        return (
          <li key={m.id} className="group relative">
            <button
              type="button"
              onClick={() => onActivate(m)}
              onDoubleClick={() => onDoubleActivate?.(m)}
              aria-pressed={onToggle ? undefined : isSel}
              aria-label={`${m.alt || m.originalName || m.url}${isSel ? " (seleccionada)" : ""}`}
              className={cn(
                "block w-full overflow-hidden rounded-lg border bg-surface text-left transition",
                isSel || highlightId === m.id ? "border-accent ring-2 ring-accent" : "border-border hover:border-border-strong",
              )}
            >
              <MediaThumb url={m.url} alt={m.alt} className="aspect-square w-full" />
              <span className="block truncate px-2 py-1.5 text-xs text-muted">{m.originalName || m.url.split("/").pop()}</span>
            </button>
            {onToggle ? (
              <label
                className={cn(
                  "absolute top-2 left-2 flex size-6 cursor-pointer items-center justify-center rounded-md border bg-surface/90 shadow-sm",
                  isSel ? "border-accent bg-accent text-accent-contrast" : "border-border-strong opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                )}
              >
                <input type="checkbox" className="sr-only" checked={isSel} onChange={() => onToggle(m)} aria-label={`Seleccionar ${m.originalName || m.url}`} />
                {isSel ? <Check aria-hidden size={14} strokeWidth={3} /> : null}
              </label>
            ) : isSel ? (
              <span aria-hidden className="pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-md bg-accent text-accent-contrast shadow">
                <Check size={14} strokeWidth={3} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
