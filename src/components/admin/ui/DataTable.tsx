"use client";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Inbox } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState, Pagination, Skeleton } from "./Display";

export interface Column<R> { key: string; header: string; cell: (row: R) => ReactNode; sortValue?: (row: R) => string | number; className?: string; align?: "right" }
interface Props<R> {
  columns: Column<R>[]; rows: R[] | undefined; rowKey: (r: R) => string; loading?: boolean; error?: string; caption: string;
  onRowClick?: (r: R) => void; empty?: ReactNode; selectable?: { selected: string[]; onChange: (ids: string[]) => void };
  pagination?: { page: number; totalPages: number; total: number; onChange: (p: number) => void };
}

export function DataTable<R>({ columns, rows, rowKey, loading, error, caption, onRowClick, empty, selectable, pagination }: Props<R>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const col = pagination ? undefined : columns.find((c) => c.key === sort?.key); // con paginación de servidor, ordenar solo la página sería engañoso
  const data = rows && col?.sortValue && sort ? [...rows].sort((a, b) => (col.sortValue!(a) > col.sortValue!(b) ? 1 : -1) * sort.dir) : rows;
  const allIds = (data ?? []).map(rowKey);
  const sel = selectable?.selected ?? [];
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}{onRowClick ? ". Pulsa Intro o Espacio sobre una fila para abrirla." : ""}</caption>
          <thead className="adm-label border-b border-line bg-surface2/50 !text-[10px]">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Seleccionar todo" className="size-[18px] accent-[var(--adm-accent)]" checked={allIds.length > 0 && allIds.every((i) => sel.includes(i))}
                    onChange={(e) => selectable.onChange(e.target.checked ? allIds : [])} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={clsx("px-3 py-3 font-normal", c.align === "right" && "text-right", c.className)}>
                  {c.sortValue && !pagination ? (
                    <button type="button" className="inline-flex min-h-10 items-center gap-1 uppercase tracking-[inherit] hover:text-fg" onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}>
                      {c.header}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : c.header || <span className="sr-only">Acciones</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                {selectable && <td className="px-3 py-3" />}
                {columns.map((c) => <td key={c.key} className="px-3 py-3"><Skeleton /></td>)}
              </tr>
            ))}
            {!loading && data?.map((r) => {
              const id = rowKey(r);
              return (
                <tr key={id} className={clsx("border-b border-line last:border-0", onRowClick && "cursor-pointer hover:bg-surface2/60 focus-visible:bg-surface2/60")}
                  tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(r)}
                  onKeyDown={(e) => { if (onRowClick && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r); } }}>
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Seleccionar fila" className="size-[18px] accent-[var(--adm-accent)]" checked={sel.includes(id)} onChange={(e) => selectable.onChange(e.target.checked ? [...sel, id] : sel.filter((x) => x !== id))} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key} className={clsx("px-3 py-2.5 align-middle", c.align === "right" && "text-right", c.className)}>{c.cell(r)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="p-6 text-center text-sm text-accent-text">{error}</p>}
      {!loading && !error && data?.length === 0 && (empty ?? <EmptyState icon={<Inbox className="size-8" />} title="Sin resultados" text="Prueba con otros filtros." />)}
      {pagination && !error && <Pagination {...pagination} />}
    </div>
  );
}
