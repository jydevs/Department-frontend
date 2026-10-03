"use client";
import { useEffect, useId, useState } from "react";
import { Field } from "@/components/admin/ui/Form";
import { useCollections, useProductByHandle, useProductSearch } from "@/lib/admin/api/catalog";
import { useDocs } from "@/lib/admin/api/content";
import { errorMessage } from "@/lib/admin/errors";

export type HandleKind = "product" | "collection" | "page";
const NOUN: Record<HandleKind, string> = { product: "producto", collection: "colección", page: "página" };
const SHOWN = 8;

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

interface Opt { h: string; t: string }
/**
 * Selector con búsqueda de un handle (producto, colección o página). Los productos se buscan EN EL SERVIDOR (título, handle o SKU) y se muestra
 * "N de M", así que funciona con catálogos grandes; "No coincide" solo aparece cuando el servidor confirma que no existe (no mientras carga ni si falla).
 */
export function HandlePicker({ kind, label, value, onChange, error, required }: { kind: HandleKind; label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean }) {
  const [q, setQ] = useState(""), [focus, setFocus] = useState(false), [active, setActive] = useState(0);
  const listId = useId();
  const term = useDebounced(q, 250);
  const search = useProductSearch(term, { allowEmpty: true, enabled: kind === "product" && focus });
  const checked = useDebounced(value, 400);
  const prod = useProductByHandle(kind === "product" ? checked : "");
  const cols = useCollections();
  const docs = useDocs();
  let all: Opt[] = [], total = 0;
  if (kind === "product") { all = (search.data?.items ?? []).map((p) => ({ h: p.handle, t: p.title })); total = search.data?.total ?? 0; }
  else if (kind === "collection") { const l = (cols.data ?? []).map((c) => ({ h: c.handle, t: c.title })); all = l.filter((o) => !q || o.t.toLowerCase().includes(q.toLowerCase()) || o.h.includes(q.toLowerCase())); total = all.length; }
  else { const l = (docs.data ?? []).filter((d) => d.kind === "page").map((d) => ({ h: d.key, t: d.title })); all = l.filter((o) => !q || o.t.toLowerCase().includes(q.toLowerCase()) || o.h.includes(q.toLowerCase())); total = all.length; }
  const opts = all.slice(0, SHOWN);
  const open = focus && opts.length > 0;
  const pick = (h: string) => { onChange(h); setFocus(false); };
  let hint: string | undefined;
  if (value) {
    if (kind === "product") hint = checked !== value || prod.isFetching && prod.data === undefined ? "Comprobando…" : prod.error ? "No se pudo comprobar este producto: reintenta más tarde" : prod.data ? prod.data.title : prod.data === null ? "No coincide con ningún producto existente" : undefined;
    else { const src = kind === "collection" ? cols : docs; const l = kind === "collection" ? (cols.data ?? []).map((c) => ({ h: c.handle, t: c.title })) : (docs.data ?? []).filter((d) => d.kind === "page").map((d) => ({ h: d.key, t: d.title })); hint = src.isLoading ? "Comprobando…" : src.error ? `No se pudo comprobar: ${errorMessage(src.error)}` : l.find((o) => o.h === value)?.t ?? `No coincide con ninguna ${NOUN[kind]} existente`; }
  }
  return (
    <Field label={label + (required ? " *" : "")} error={error} hint={hint}>
      <div className="relative">
        <input role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open ? `${listId}-${active}` : undefined} aria-label={label}
          className="h-9 w-full rounded-sm border border-line bg-surface px-3 text-sm focus:border-accent" value={focus ? q : value} placeholder={`Buscar ${NOUN[kind]}…`}
          onFocus={() => { setFocus(true); setQ(""); setActive(0); }} onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => { setQ(e.target.value); setActive(0); onChange(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setFocus(true); setActive((a) => Math.min(opts.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && open) { e.preventDefault(); pick(opts[active]?.h ?? value); }
            else if (e.key === "Escape" && open) { e.stopPropagation(); setFocus(false); }
          }} />
        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-sm border border-line bg-surface p-1 shadow-xl">
            <ul id={listId} role="listbox" aria-label={label}>{opts.map((o, i) => <li key={o.h} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={`flex cursor-pointer justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${i === active ? "bg-surface2" : ""}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(o.h)}><span className="truncate">{o.t}</span><span className="shrink-0 text-xs text-muted">{o.h}</span></li>)}</ul>
            {total > opts.length && <p className="px-2 py-1 text-[11px] text-muted">Mostrando {opts.length} de {total}: escribe para filtrar</p>}
          </div>
        )}
      </div>
    </Field>
  );
}
