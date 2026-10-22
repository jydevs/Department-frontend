"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Skeleton } from "./spinner";
import { ErrorState } from "./display";
import { Pagination, type PaginationProps } from "./navigation";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Muestra el encabezado como botón de orden; el orden lo aplica el servidor vía `onSortChange`. */
  sortable?: boolean;
  align?: "left" | "right" | "center";
  /** Ancho CSS (p. ej. "120px" o "20%"). */
  width?: string;
  /** Oculta la columna en pantallas pequeñas (< md). */
  hideOnMobile?: boolean;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export interface DataTableSelection {
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Contenido cuando no hay filas (p. ej. <EmptyState …/>). */
  empty?: ReactNode;
  /** Error de la consulta (se muestra <ErrorState/>); con `onRetry` ofrece reintentar. */
  error?: unknown;
  onRetry?: () => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  pagination?: PaginationProps;
  /** Casillas de selección para acciones masivas. */
  selection?: DataTableSelection;
  /** Nombre accesible de la tabla. */
  "aria-label"?: string;
  /** Filas esqueleto mientras carga (por defecto 6). */
  skeletonRows?: number;
  className?: string;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  loading = false,
  empty,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  selection,
  "aria-label": ariaLabel,
  skeletonRows = 6,
  className,
}: DataTableProps<T>) {
  const hasError = error !== undefined && error !== null && error !== false;
  const showSkeleton = loading && rows.length === 0 && !hasError;
  const showEmpty = !loading && !hasError && rows.length === 0;

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (!sort || sort.key !== key) onSortChange({ key, dir: "asc" });
    else if (sort.dir === "asc") onSortChange({ key, dir: "desc" });
    else onSortChange(null);
  };

  const allIds = rows.map(getRowId);
  const allSelected = !!selection && allIds.length > 0 && allIds.every((id) => selection.selected.has(id));
  const someSelected = !!selection && allIds.some((id) => selection.selected.has(id));

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (allSelected) allIds.forEach((id) => next.delete(id));
    else allIds.forEach((id) => next.add(id));
    selection.onChange(next);
  };
  const toggleOne = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  const colCount = columns.length + (selection ? 1 : 0);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div className="relative overflow-x-auto" aria-busy={loading || undefined}>
        <table className="w-full border-collapse text-sm" aria-label={ariaLabel} aria-rowcount={pagination ? pagination.total : rows.length}>
          <thead>
            <tr className="border-b border-border bg-surface-2/60">
              {selection ? (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas las filas"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    className="size-4 cursor-pointer accent-[var(--accent)]"
                  />
                </th>
              ) : null}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={c.sortable ? (active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                    className={cn("px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase", alignClass[c.align ?? "left"], c.hideOnMobile && "hidden md:table-cell")}
                  >
                    {c.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn("inline-flex items-center gap-1 rounded uppercase hover:text-text", active && "text-text", c.align === "right" && "flex-row-reverse")}
                      >
                        {c.header}
                        {active ? sort?.dir === "asc" ? <ArrowUp aria-hidden size={12} /> : <ArrowDown aria-hidden size={12} /> : <ChevronsUpDown aria-hidden size={12} className="opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                    {selection ? (
                      <td className="px-3 py-3.5">
                        <Skeleton className="size-4" />
                      </td>
                    ) : null}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3.5", c.hideOnMobile && "hidden md:table-cell")}>
                        <Skeleton className={cn("h-4", i % 2 ? "w-3/4" : "w-full", c.align === "right" && "ml-auto")} />
                      </td>
                    ))}
                  </tr>
                ))
              : null}
            {!showSkeleton && !hasError
              ? rows.map((row) => {
                  const id = getRowId(row);
                  const selected = selection?.selected.has(id) ?? false;
                  return (
                    <tr
                      key={id}
                      aria-selected={selection ? selected : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (e) => onRowKey(e, row) : undefined}
                      className={cn(
                        "border-b border-border transition-colors last:border-0",
                        onRowClick && "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2",
                        selected && "bg-accent/5",
                        loading && "opacity-60",
                      )}
                    >
                      {selection ? (
                        <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" aria-label="Seleccionar fila" checked={selected} onChange={() => toggleOne(id)} className="size-4 cursor-pointer accent-[var(--accent)]" />
                        </td>
                      ) : null}
                      {columns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-3 align-middle", alignClass[c.align ?? "left"], c.hideOnMobile && "hidden md:table-cell")}>
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
      {hasError ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {showEmpty ? (
        <div role="status" data-cols={colCount}>
          {empty ?? <p className="px-6 py-12 text-center text-sm text-muted">Sin resultados.</p>}
        </div>
      ) : null}
      {pagination && !hasError ? <Pagination {...pagination} className="border-t border-border" /> : null}
    </div>
  );
}
