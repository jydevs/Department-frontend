"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button, Dialog, EmptyState, ErrorState, Pagination, SearchInput, Skeleton } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { useMediaList, type MediaItem } from "@/lib/admin/api/media";
import { MediaGrid } from "./media-grid";
import { Dropzone, UploadList } from "./media-parts";
import { useUploader } from "./use-uploader";

export interface MediaPickerItem {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaPickerItem[]) => void;
  /** Permite elegir varias imágenes. Por defecto una. */
  multiple?: boolean;
}

const PAGE_SIZE = 24;

/** Selector de la biblioteca de medios en un modal: subir (arrastrar/soltar, varios archivos), buscar y elegir. */
export function MediaPicker(props: MediaPickerProps) {
  if (!props.open) return null;
  return <PickerDialog {...props} />;
}

function PickerDialog({ onClose, onSelect, multiple = false }: MediaPickerProps) {
  const canUpload = useCan("media:write");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<MediaItem[]>([]);
  const list = useMediaList({ page, pageSize: PAGE_SIZE, q });

  const select = (items: MediaItem[]) => {
    setChosen((cur) => {
      if (!multiple) return items.slice(0, 1);
      const ids = new Set(cur.map((c) => c.id));
      return [...cur, ...items.filter((i) => !ids.has(i.id))];
    });
  };
  const uploader = useUploader((media) => {
    setPage(1);
    select(media);
  });

  const toggle = (m: MediaItem) => {
    setChosen((cur) => {
      const has = cur.some((c) => c.id === m.id);
      if (!multiple) return has ? [] : [m];
      return has ? cur.filter((c) => c.id !== m.id) : [...cur, m];
    });
  };

  const confirm = (items: MediaItem[]) => {
    if (!items.length) return;
    onSelect(items.map((m) => ({ id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height })));
    onClose();
  };

  const selectedIds = new Set(chosen.map((c) => c.id));
  const items = list.data?.items ?? [];

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="Biblioteca de medios"
      description={multiple ? "Elige una o varias imágenes, o sube nuevas." : "Elige una imagen o sube una nueva."}
      footer={
        <>
          <span className="mr-auto text-sm text-muted" aria-live="polite">
            {chosen.length ? `${chosen.length} seleccionada${chosen.length === 1 ? "" : "s"}` : "Nada seleccionado"}
          </span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!chosen.length} onClick={() => confirm(chosen)}>
            {multiple ? "Usar selección" : "Usar imagen"}
          </Button>
        </>
      }
    >
      <div className="flex min-h-[420px] flex-col gap-4">
        {chosen.some((c) => c.url.startsWith("http://")) ? (
          <p role="status" className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
            Esta imagen se sirve por http://. Las secciones y ajustes solo aceptan https:// o rutas /…, así que el servidor la rechazará al guardar (en producción la URL pública de la API debe ser https).
          </p>
        ) : null}
        {canUpload ? <Dropzone compact onFiles={uploader.addFiles} /> : null}
        <UploadList entries={uploader.entries} onClear={uploader.clearFinished} />
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar por nombre o texto alternativo…"
          className="max-w-sm"
        />
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ImageIcon aria-hidden size={22} />} title={q ? "Sin resultados" : "Aún no hay imágenes"} description={q ? "Prueba con otro término." : "Sube la primera imagen arrastrándola aquí."} />
        ) : (
          <>
            <MediaGrid items={items} selected={selectedIds} onActivate={toggle} onDoubleActivate={multiple ? undefined : (m) => confirm([m])} />
            {list.data && list.data.totalPages > 1 ? <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={setPage} pageSizes={[PAGE_SIZE]} /> : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
