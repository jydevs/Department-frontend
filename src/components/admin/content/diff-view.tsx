"use client";

import { ArrowRight, MoveVertical, PencilLine, PlusCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import type { DiffEntry, DiffKind } from "./doc-diff";

const STYLE: Record<DiffKind, { icon: typeof PlusCircle; cls: string; label: string }> = {
  added: { icon: PlusCircle, cls: "text-success", label: "Añadido" },
  removed: { icon: MinusCircle, cls: "text-danger", label: "Eliminado" },
  changed: { icon: PencilLine, cls: "text-info", label: "Modificado" },
  moved: { icon: MoveVertical, cls: "text-warning", label: "Movido" },
};

/** Lista legible de cambios (secciones añadidas, quitadas, movidas o modificadas y los campos afectados). */
export function DiffView({ entries, emptyText = "Sin diferencias." }: { entries: DiffEntry[]; emptyText?: string }) {
  if (!entries.length) return <p className="text-sm text-muted">{emptyText}</p>;
  return (
    <ul className="flex flex-col gap-2" data-testid="diff-view">
      {entries.map((e, i) => {
        const s = STYLE[e.kind];
        const Icon = s.icon;
        return (
          <li key={`${e.title}-${i}`} className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
            <div className="flex items-start gap-2">
              <Icon aria-hidden size={16} className={cn("mt-0.5 shrink-0", s.cls)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {e.title} <span className="font-normal text-muted">· {e.subtitle ?? s.label}</span>
                </p>
                {e.fields.length ? (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {e.fields.map((f, j) => (
                      <li key={`${f.field}-${j}`} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                        <span className="text-muted">{f.field}</span>
                        {f.before !== undefined || f.after !== undefined ? (
                          <span className="inline-flex min-w-0 items-baseline gap-1.5">
                            <span className="max-w-[220px] truncate text-danger/90 line-through decoration-danger/40">{f.before}</span>
                            <ArrowRight aria-hidden size={12} className="shrink-0 self-center text-muted" />
                            <span className="max-w-[220px] truncate text-success">{f.after}</span>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
