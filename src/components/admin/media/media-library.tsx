"use client";

import { useState } from "react";
import { Link } from "@/lib/admin/navigation";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button, Card, CopyButton, DateTime, Drawer, Dialog, EmptyState, ErrorState, Input, NoAccess, PageHeader, Pagination, SearchInput, Skeleton, useConfirm, useToast } from "@/components/admin/ui";
import { errorMessage, isForbidden } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { formatNumber } from "@/lib/admin/format";
import {
  resolveMediaSrc,
  useDeleteMedia,
  useMediaList,
  useMediaUsages,
  usagesFromError,
  useUpdateMediaAlt,
  type MediaItem,
  type MediaUsage,
} from "@/lib/admin/api/media";
import { useDocuments, type DocListItem } from "@/lib/admin/api/content";
import { MediaGrid } from "./media-grid";
import { Dropzone, MediaThumb, UploadList, formatBytes } from "./media-parts";
import { useUploader } from "./use-uploader";

const PAGE_SIZE = 30;

const USAGE_LABELS: Record<MediaUsage["type"], string> = {
  product: "Producto",
  collection: "Colección",
  content_document: "Documento (borrador)",
  content_version: "Versión publicada o programada",
};

function docHref(kind: string, key: string): string | null {
  if (kind === "template") return `/content/templates/${encodeURIComponent(key)}`;
  if (kind === "page") return `/content/pages/${encodeURIComponent(key)}`;
  if (kind === "menu") return `/content/menus/${encodeURIComponent(key)}`;
  if (kind === "settings") return "/content/settings";
  return null;
}

/** Enlace al recurso que usa la imagen (cuando se puede resolver). */
function usageHref(u: MediaUsage, docs: DocListItem[] | undefined): string | null {
  if (u.type === "product") return `/products/${u.id}`;
  if (u.type === "collection") return `/collections/${u.id}`;
  if (u.type === "content_document") {
    const d = docs?.find((x) => x.id === u.id);
    return d ? docHref(d.kind, d.key) : null;
  }
  const m = /^(\w+):([^\s]+) v\d+$/.exec(u.label);
  return m ? docHref(m[1], m[2]) : null;
}

function UsageList({ usages, docs }: { usages: MediaUsage[]; docs: DocListItem[] | undefined }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border text-sm">
      {usages.map((u) => {
        const href = usageHref(u, docs);
        return (
          <li key={`${u.type}-${u.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">
              {href ? (
                <Link href={href} className="hover:underline">
                  {u.label}
                </Link>
              ) : (
                u.label
              )}
            </span>
            <span className="shrink-0 text-xs text-muted">{USAGE_LABELS[u.type]}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MediaLibrary() {
  const canRead = useCan("content:read");
  const canWrite = useCan("media:write");
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [inUse, setInUse] = useState<{ item: MediaItem; usages: MediaUsage[] } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const list = useMediaList({ page, pageSize: PAGE_SIZE, q }, canRead);
  const del = useDeleteMedia();
  const docs = useDocuments();
  const uploader = useUploader((media) => {
    setPage(1);
    toast.success(media.length === 1 ? "Imagen subida" : `${media.length} imágenes subidas`);
  });

  if (!canRead) return <NoAccess permission="content:read" />;

  const items = list.data?.items ?? [];

  const removeOne = async (item: MediaItem, opts: { force?: boolean } = {}): Promise<"ok" | "in-use" | "error"> => {
    try {
      await del.mutateAsync({ id: item.id, force: opts.force });
      setSelected((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
      return "ok";
    } catch (e) {
      if (e instanceof Error && "code" in e && (e as { code: string }).code === "MEDIA_IN_USE") {
        setInUse({ item, usages: usagesFromError(e) });
        return "in-use";
      }
      toast.error(isForbidden(e) ? "No tienes permiso para eliminar medios." : errorMessage(e));
      return "error";
    }
  };

  const deleteWithConfirm = async (item: MediaItem) => {
    const ok = await confirm({ title: "¿Eliminar esta imagen?", description: "Se borrará el archivo de la biblioteca. Si se usa en algún lugar, te lo mostraremos antes de continuar.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    const r = await removeOne(item);
    if (r === "ok") {
      toast.success("Imagen eliminada");
      setDetail((d) => (d?.id === item.id ? null : d));
    }
  };

  const forceDelete = async () => {
    if (!inUse) return;
    const ok = await confirm({
      title: "Eliminar de todos modos",
      description: "Se quitará la imagen de productos y colecciones que la usan. Los documentos de contenido que la referencian por URL se quedarán con un enlace roto hasta que los edites.",
      confirmLabel: "Eliminar y desvincular",
      tone: "danger",
    });
    if (!ok) return;
    const item = inUse.item;
    const r = await removeOne(item, { force: true });
    if (r === "ok") {
      toast.success("Imagen eliminada");
      setInUse(null);
      setDetail((d) => (d?.id === item.id ? null : d));
    }
  };

  const bulkDelete = async () => {
    const chosen = items.filter((m) => selected.has(m.id));
    const ok = await confirm({
      title: `¿Eliminar ${chosen.length} imagen${chosen.length === 1 ? "" : "es"}?`,
      description: "Las que estén en uso no se eliminarán; te avisaremos cuáles.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setBulkBusy(true);
    let deleted = 0;
    let blocked = 0;
    for (const m of chosen) {
      try {
        await del.mutateAsync({ id: m.id });
        deleted += 1;
      } catch (e) {
        if (e instanceof Error && "code" in e && (e as { code: string }).code === "MEDIA_IN_USE") blocked += 1;
        else toast.error(errorMessage(e));
      }
    }
    setBulkBusy(false);
    setSelected(new Set());
    if (deleted) toast.success(`${deleted} eliminada${deleted === 1 ? "" : "s"}`);
    if (blocked) toast.warning(`${blocked} no se eliminó porque está en uso. Ábrela para ver dónde.`);
  };

  const toggle = (m: MediaItem) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(m.id)) n.delete(m.id);
      else n.add(m.id);
      return n;
    });

  return (
    <>
      <PageHeader
        title="Biblioteca de medios"
        description="Imágenes del sitio. Súbelas una vez y úsalas en secciones, ajustes, productos y colecciones."
        meta={list.data ? <span className="text-sm text-muted">{formatNumber(list.data.total)} {list.data.total === 1 ? "archivo" : "archivos"}</span> : null}
      />
      <div className="flex flex-col gap-4">
        {canWrite ? <Dropzone onFiles={uploader.addFiles} /> : <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted">Tu rol puede ver la biblioteca pero no subir ni eliminar archivos.</p>}
        <UploadList entries={uploader.entries} onClear={uploader.clearFinished} />
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Buscar por nombre o texto alternativo…"
            className="w-full max-w-sm"
          />
          {selected.size > 0 ? (
            <div className="flex items-center gap-2" role="status">
              <span className="text-sm text-muted">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
              {canWrite ? (
                <Button size="sm" variant="danger" loading={bulkBusy} leftIcon={<Trash2 aria-hidden size={14} />} onClick={() => void bulkDelete()}>
                  Eliminar
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Quitar selección
              </Button>
            </div>
          ) : null}
        </div>
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={<ImageIcon aria-hidden size={22} />} title={q ? "Sin resultados" : "La biblioteca está vacía"} description={q ? "Prueba con otro término de búsqueda." : "Sube imágenes arrastrándolas a la zona de arriba."} />
          </Card>
        ) : (
          <>
            <MediaGrid items={items} selected={selected} onActivate={setDetail} onToggle={canWrite ? toggle : undefined} highlightId={detail?.id} />
            {list.data && list.data.total > PAGE_SIZE ? <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} pageSizes={[PAGE_SIZE]} /> : null}
          </>
        )}
      </div>

      <Drawer open={detail !== null} onClose={() => setDetail(null)} title="Detalle de la imagen" width={440}>
        {detail ? <MediaDetail key={detail.id} item={detail} canWrite={canWrite} docs={docs.data} onDelete={() => void deleteWithConfirm(detail)} onSaved={setDetail} /> : null}
      </Drawer>

      <Dialog
        open={inUse !== null}
        onClose={() => setInUse(null)}
        title="Esta imagen está en uso"
        description="Para eliminarla sin romper nada, primero reemplázala en los lugares de abajo. También puedes forzar la eliminación."
        footer={
          <>
            <Button onClick={() => setInUse(null)}>Cancelar</Button>
            {canWrite ? (
              <Button variant="danger" onClick={() => void forceDelete()}>
                Eliminar de todos modos
              </Button>
            ) : null}
          </>
        }
      >
        {inUse ? <UsageList usages={inUse.usages} docs={docs.data} /> : null}
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Forzar la eliminación desvincula la imagen de productos y colecciones. Las secciones y ajustes que la referencien por URL quedarán con la imagen rota.
        </p>
      </Dialog>
    </>
  );
}

function MediaDetail({ item, canWrite, docs, onDelete, onSaved }: { item: MediaItem; canWrite: boolean; docs: DocListItem[] | undefined; onDelete: () => void; onSaved: (m: MediaItem) => void }) {
  const toast = useToast();
  const update = useUpdateMediaAlt();
  const usages = useMediaUsages(item.id);
  const [alt, setAlt] = useState(item.alt ?? "");
  const full = resolveMediaSrc(item.url) ?? item.url;
  const dirty = alt !== (item.alt ?? "");

  const save = async () => {
    try {
      const m = await update.mutateAsync({ id: item.id, alt: alt.trim() === "" ? null : alt.trim() });
      onSaved(m);
      toast.success("Texto alternativo guardado");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <MediaThumb url={item.url} alt={item.alt} className="max-h-72 w-full rounded-lg border border-border object-contain" />
      <Input label="Texto alternativo (alt)" value={alt} maxLength={300} disabled={!canWrite} onChange={(e) => setAlt(e.target.value)} hint="Describe la imagen para lectores de pantalla y SEO. Máx. 300 caracteres." />
      {canWrite ? (
        <div>
          <Button variant="primary" size="sm" disabled={!dirty} loading={update.isPending} onClick={() => void save()}>
            Guardar texto alternativo
          </Button>
        </div>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Nombre</dt>
        <dd className="min-w-0 truncate">{item.originalName ?? "—"}</dd>
        <dt className="text-muted">Dimensiones</dt>
        <dd>{item.width && item.height ? `${item.width} × ${item.height} px` : "—"}</dd>
        <dt className="text-muted">Tamaño</dt>
        <dd>{formatBytes(item.byteSize)}</dd>
        <dt className="text-muted">Tipo</dt>
        <dd>{item.mimeType ?? "—"}</dd>
        <dt className="text-muted">Subida</dt>
        <dd>
          <DateTime value={item.createdAt} />
        </dd>
      </dl>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">URL</span>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs">{item.url}</code>
          <CopyButton value={full} label="Copiar" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm">Dónde se usa</h3>
        {usages.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : usages.isError ? (
          <p className="text-sm text-danger">{errorMessage(usages.error)}</p>
        ) : usages.data.length === 0 ? (
          <p className="text-sm text-muted">No se usa en ningún producto, colección ni contenido.</p>
        ) : (
          <UsageList usages={usages.data} docs={docs} />
        )}
      </div>
      {canWrite ? (
        <div className="border-t border-border pt-4">
          <Button variant="danger" leftIcon={<Trash2 aria-hidden size={14} />} onClick={onDelete}>
            Eliminar imagen
          </Button>
        </div>
      ) : null}
    </div>
  );
}
