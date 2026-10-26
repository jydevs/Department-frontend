"use client";
import { Plus, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Badge, Spinner } from "@/components/admin/ui/Display";
import { Input } from "@/components/admin/ui/Form";
import { SortableList } from "@/components/admin/ui/Sortable";
import { useToast } from "@/components/admin/ui/Toast";
import { addCollectionMembers, fetchCollectionMembers, removeCollectionMember, reorderCollectionMember, useProductSearch, type CollectionMember } from "@/lib/admin/api/catalog";
import { errorMessage } from "@/lib/admin/errors";

const STATUS_TONE = { draft: ["Borrador", "warn"], archived: ["Archivado", "neutral"] } as const;

/**
 * Productos de una colección MANUAL. Todas las operaciones son incrementales y se aplican al instante (no dependen del botón
 * "Guardar" de la colección): añadir, quitar y reordenar llaman cada una a su endpoint, así que nunca se reemplaza ni se pierde
 * ningún miembro que no esté en pantalla. La lista incluye todos los estados y se pagina con "Cargar más".
 * Reordenar: el cambio se ve al soltar y se revierte si el servidor lo rechaza.
 */
export function CollectionMembers({ collectionId, sortManual, canWrite }: { collectionId: string; sortManual: boolean; canWrite: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<CollectionMember[]>([]);
  const [total, setTotal] = useState(0), [page, setPage] = useState(0), [totalPages, setTotalPages] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null), [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false), [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  /** Carga las páginas 1..`upto` (sustituye la lista). `silent`: recarga tras una acción (un fallo se avisa con un aviso y se conserva la lista). */
  const load = useCallback(async (upto: number, silent = false) => {
    try {
      const all: CollectionMember[] = [];
      let last = 0, tp = 1, tot = 0;
      for (let p = 1; p <= upto && p <= tp; p++) {
        const r = await fetchCollectionMembers(collectionId, p);
        all.push(...r.items); last = p; tp = r.totalPages; tot = r.total;
      }
      if (!alive.current) return;
      setItems(all); setPage(last); setTotalPages(tp); setTotal(tot); setError(null); setMoreError(null); setPhase("ready");
    } catch (e) {
      if (!alive.current) return;
      if (silent) toast.error(errorMessage(e));
      else { setError(errorMessage(e)); setPhase("error"); }
    }
  }, [collectionId, toast]);
  // carga inicial: el estado solo cambia tras la respuesta de la API
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(1); }, [load]);

  const loadMore = async () => {
    setLoadingMore(true); setMoreError(null);
    try {
      const r = await fetchCollectionMembers(collectionId, page + 1);
      if (!alive.current) return;
      setItems((prev) => [...prev, ...r.items.filter((m) => !prev.some((x) => x.id === m.id))]);
      setPage(r.page); setTotalPages(r.totalPages); setTotal(r.total);
    } catch (e) { setMoreError(errorMessage(e)); } finally { if (alive.current) setLoadingMore(false); }
  };

  const search = useProductSearch(q, { pageSize: 8, enabled: canWrite });
  const results = q.trim() ? (search.data?.items ?? []).filter((p) => !items.some((x) => x.id === p.id)) : [];

  const add = async (id: string, title: string) => {
    setBusy(id);
    try {
      const r = await addCollectionMembers(collectionId, [id]);
      setQ("");
      toast.success(r.added.length ? `“${title}” se añadió al final de la colección` : `“${title}” ya estaba en la colección`);
      await load(Math.max(1, page), true);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  const remove = async (m: CollectionMember) => {
    setBusy(m.id);
    try { await removeCollectionMember(collectionId, m.id); toast.success(`“${m.title}” se quitó de la colección`); await load(Math.max(1, page), true); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  const move = async (next: CollectionMember[], moved: { id: string; to: number }) => {
    const prev = items;
    setItems(next); setBusy(moved.id);
    try {
      // la lista cargada es un prefijo contiguo del orden completo: su índice es la posición global
      await reorderCollectionMember(collectionId, moved.id, moved.to);
    } catch (e) { if (alive.current) { setItems(prev); toast.error(`No se pudo reordenar (se revirtió el cambio): ${errorMessage(e)}`); } }
    finally { if (alive.current) setBusy(null); }
  };

  return (
    <div className="space-y-3" data-testid="collection-members">
      <p className="rounded-sm border border-line bg-surface2 p-2 text-xs text-muted">Los cambios en esta lista se aplican al instante (no necesitan “Guardar”). Se muestran todos los productos de la colección, también borradores y archivados; la tienda solo muestra los activos.{!sortManual && " El orden manual solo se aplica en la tienda si el “Orden de productos” de la colección es Manual."}</p>
      {canWrite && (
        <div className="relative"><Input aria-label="Buscar producto para añadir" placeholder="Buscar producto para añadir…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q.trim() && (search.error ? <p role="alert" className="mt-1 text-xs text-accent-text">No se pudo buscar: {errorMessage(search.error)}</p>
            : results.length > 0 ? <div className="absolute z-10 mt-1 w-full rounded-sm border border-line bg-surface p-1 shadow-xl"><ul>{results.map((p) => <li key={p.id}><button type="button" disabled={busy !== null} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface2 disabled:opacity-50" onClick={() => void add(p.id, p.title)}><Plus className="size-3.5" />{p.title}</button></li>)}</ul>{(search.data?.total ?? 0) > (search.data?.items.length ?? 0) && <p className="px-2 py-1 text-[11px] text-muted">Mostrando {search.data?.items.length} de {search.data?.total}: afina la búsqueda</p>}</div>
            : search.data && !search.isFetching ? <p className="mt-1 text-xs text-muted">Ningún producto coincide{search.data.items.length > 0 ? " (los que coinciden ya están en la lista cargada)" : ""}.</p> : null)}
        </div>
      )}
      {phase === "loading" && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Cargando productos…</div>}
      {phase === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-sm border border-accent/50 bg-accent/10 p-3 text-sm">
          <p className="min-w-0 flex-1">No se pudieron cargar los productos de la colección: {error}</p>
          <Button size="sm" variant="primary" icon={<RefreshCw className="size-3.5" />} onClick={() => { setPhase("loading"); void load(1); }}>Reintentar</Button>
        </div>
      )}
      {phase === "ready" && items.length === 0 && <p className="text-sm text-muted">Esta colección aún no tiene productos.{canWrite ? " Busca arriba para añadir." : ""}</p>}
      {phase === "ready" && items.length > 0 && <p className="text-xs text-muted" role="status">{total} producto(s) en la colección{items.length < total ? ` · mostrando ${items.length}` : ""}.</p>}
      {phase === "ready" && items.length > 0 && (
        <fieldset disabled={!canWrite || busy !== null} aria-busy={busy !== null}>
          <SortableList items={items} getId={(p) => p.id} onChange={(next, moved) => void move(next, moved)}>
            {(p, handle) => (
              <div data-testid="member-row" data-status={p.status} className="mb-1.5 flex items-center gap-2 rounded-sm border border-line bg-surface p-2">{handle}
                {p.image ? <Image src={p.image} alt="" width={32} height={40} unoptimized className="h-10 w-8 rounded object-cover" /> : <span className="size-8" />}
                <span className="flex-1 truncate text-sm">{p.title}</span>
                {p.status !== "active" && <Badge tone={STATUS_TONE[p.status][1]}>{STATUS_TONE[p.status][0]}</Badge>}
                <IconButton label={`Quitar ${p.title}`} onClick={() => void remove(p)}><X className="size-4" /></IconButton>
              </div>
            )}
          </SortableList>
        </fieldset>
      )}
      {phase === "ready" && page < totalPages && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" loading={loadingMore} onClick={() => void loadMore()}>Cargar más ({total - items.length} restantes)</Button>
          {moreError && <p role="alert" className="text-xs text-accent-text">{moreError}</p>}
        </div>
      )}
    </div>
  );
}
