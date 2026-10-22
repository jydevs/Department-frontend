"use client";

import { useMemo, useState } from "react";
import { CalendarClock, History, RotateCcw, Save, Send, Undo2 } from "lucide-react";
import { Badge, Button, DateTime, DateTimeInput, Dialog, Drawer, JsonView, Pagination, Skeleton, Spinner, Textarea, useConfirm } from "@/components/admin/ui";
import { relativeTime } from "@/lib/admin/format";
import { errorMessage } from "@/lib/admin/errors";
import { useSectionTypes, useVersion, useVersions, type ContentKind, type VersionStatus, type VersionSummary } from "@/lib/admin/api/content";
import { DiffView } from "./diff-view";
import { diffDocument } from "./doc-diff";
import type { DocumentEditor } from "./use-document-editor";

/** Etiqueta amigable de cada tipo de sección (a partir del catálogo del servidor). */
export function useSectionTypeLabel(): (type: string) => string {
  const q = useSectionTypes();
  const map = useMemo(() => new Map((q.data ?? []).map((t) => [t.type, t.label])), [q.data]);
  return (type) => map.get(type) ?? type;
}

const STATUS: Record<VersionStatus, { label: string; tone: "success" | "info" | "neutral" }> = {
  published: { label: "Publicada", tone: "success" },
  scheduled: { label: "Programada", tone: "info" },
  superseded: { label: "Anterior", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

interface BarProps {
  kind: ContentKind;
  docKey: string;
  editor: DocumentEditor;
  className?: string;
}

/** Barra fija: estado del documento + guardar, descartar, publicar, programar e historial. */
export function PublishBar({ kind, docKey, editor, className }: BarProps) {
  const confirm = useConfirm();
  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { detail, dirty, canWrite, canPublish } = editor;

  const unpublished = detail?.hasUnpublishedChanges ?? false;
  const nextSchedule = detail?.scheduled[0];

  const discard = async () => {
    const ok = await confirm({
      title: "¿Descartar los cambios?",
      description: dirty && !unpublished ? "Se perderán los cambios sin guardar de esta pantalla." : "El borrador volverá a ser igual a lo que está publicado actualmente. Esta acción no se puede deshacer.",
      confirmLabel: "Descartar cambios",
      tone: "danger",
    });
    if (!ok) return;
    if (!unpublished && dirty) {
      await editor.reload();
      return;
    }
    await editor.discard();
  };

  const status = (
    <div className="flex min-w-0 flex-wrap items-center gap-2" aria-live="polite" data-testid="doc-status">
      {dirty ? (
        <Badge tone="warning" dot>
          Cambios sin guardar
        </Badge>
      ) : unpublished ? (
        <Badge tone="warning" dot>
          Borrador sin publicar
        </Badge>
      ) : detail?.published ? (
        <Badge tone="success" dot>
          Publicado
        </Badge>
      ) : (
        <Badge tone="neutral">Sin publicar</Badge>
      )}
      {detail?.published?.publishedAt ? <span className="text-xs text-muted">Última publicación {relativeTime(detail.published.publishedAt)}</span> : null}
      {nextSchedule?.publishAt ? (
        <Badge tone="info">
          <CalendarClock aria-hidden size={12} /> Programado: <DateTime value={nextSchedule.publishAt} />
        </Badge>
      ) : null}
    </div>
  );

  return (
    <>
      <div className={className ?? "sticky top-[var(--topbar-h)] z-30 -mx-4 mb-5 border-b border-border bg-bg/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"} data-testid="publish-bar">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {status}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" leftIcon={<History aria-hidden size={14} />} onClick={() => setHistoryOpen(true)}>
              Historial
            </Button>
            {canWrite ? (
              <>
                <Button size="sm" variant="ghost" leftIcon={<Undo2 aria-hidden size={14} />} disabled={!dirty && !unpublished} loading={editor.discarding} onClick={() => void discard()}>
                  Descartar cambios
                </Button>
                <Button size="sm" leftIcon={<Save aria-hidden size={14} />} disabled={!dirty} loading={editor.saving} onClick={() => void editor.save()} title="Ctrl/Cmd + S">
                  Guardar borrador
                </Button>
              </>
            ) : null}
            {canPublish ? (
              <>
                <Button size="sm" leftIcon={<CalendarClock aria-hidden size={14} />} onClick={() => setScheduleOpen(true)}>
                  Programar
                </Button>
                <Button size="sm" variant="primary" leftIcon={<Send aria-hidden size={14} />} onClick={() => setPublishOpen(true)} disabled={!dirty && !unpublished}>
                  Publicar
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {editor.conflict ? (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
            Alguien más guardó cambios en este documento. Si guardas ahora se rechazará para no pisar su trabajo.
            <Button size="sm" onClick={() => void editor.reload()}>
              Recargar y perder mis cambios
            </Button>
          </div>
        ) : null}
      </div>

      {publishOpen ? <PublishDialog kind={kind} docKey={docKey} editor={editor} onClose={() => setPublishOpen(false)} /> : null}
      {scheduleOpen ? <ScheduleDialog editor={editor} onClose={() => setScheduleOpen(false)} /> : null}
      <HistoryDrawer kind={kind} docKey={docKey} editor={editor} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function useChangesVsPublished(kind: ContentKind, docKey: string, editor: DocumentEditor) {
  const typeLabel = useSectionTypeLabel();
  const pub = useVersion(kind, docKey, editor.detail?.published?.versionId);
  const published = editor.detail?.published ?? null;
  const loading = !!published && pub.isPending;
  const entries = useMemo(() => {
    if (!editor.data) return [];
    if (published && !pub.data) return [];
    return diffDocument(kind, published ? (pub.data?.data ?? null) : null, editor.data, typeLabel);
  }, [kind, published, pub.data, editor.data, typeLabel]);
  return { entries, loading, error: pub.error, hasPublished: !!published };
}

function PublishDialog({ kind, docKey, editor, onClose }: { kind: ContentKind; docKey: string; editor: DocumentEditor; onClose: () => void }) {
  const [note, setNote] = useState("");
  const changes = useChangesVsPublished(kind, docKey, editor);
  const nothing = !changes.loading && changes.hasPublished && changes.entries.length === 0 && !changes.error;

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!editor.publishing}
      size="lg"
      title="Publicar cambios"
      description={editor.dirty ? "Se guardará el borrador y se publicará de inmediato en la tienda." : "Los cambios del borrador se publicarán de inmediato en la tienda."}
      footer={
        <>
          <Button onClick={onClose} disabled={editor.publishing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            leftIcon={<Send aria-hidden size={14} />}
            loading={editor.publishing || editor.saving}
            disabled={nothing}
            onClick={async () => {
              if (await editor.publish(note)) onClose();
            }}
          >
            Publicar ahora
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <section aria-label="Resumen de cambios">
          <h3 className="mb-2 text-sm">Qué cambia respecto a lo publicado</h3>
          {changes.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner size={14} /> Calculando diferencias…
            </div>
          ) : changes.error ? (
            <p className="text-sm text-danger">{errorMessage(changes.error)}</p>
          ) : (
            <DiffView entries={changes.entries} emptyText="No hay cambios: el borrador es igual a la versión publicada." />
          )}
        </section>
        <Textarea label="Nota de la versión (opcional)" rows={2} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Nuevo hero de temporada" />
      </div>
    </Dialog>
  );
}

function ScheduleDialog({ editor, onClose }: { editor: DocumentEditor; onClose: () => void }) {
  const [when, setWhen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [now] = useState(() => Date.now());
  const minIso = new Date(now + 60_000).toISOString();
  const maxMs = now + 365 * 24 * 3600 * 1000;
  const err = !when ? "Elige la fecha y la hora" : new Date(when).getTime() <= now ? "Debe ser una fecha futura" : new Date(when).getTime() > maxMs ? "Máximo 1 año hacia adelante" : null;
  const scheduled = editor.detail?.scheduled ?? [];

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!editor.scheduling}
      title="Programar publicación"
      description="Se publicará una copia del borrador tal como está ahora, a la hora que elijas."
      footer={
        <>
          <Button onClick={onClose} disabled={editor.scheduling}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            leftIcon={<CalendarClock aria-hidden size={14} />}
            loading={editor.scheduling || editor.saving}
            onClick={async () => {
              setTouched(true);
              if (err || !when) return;
              if (await editor.schedule(when, note)) {
                setWhen(null);
                setNote("");
                setTouched(false);
              }
            }}
          >
            Programar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DateTimeInput label="Fecha y hora de publicación" value={when} onChange={setWhen} min={minIso} error={touched ? err : null} />
        <Textarea label="Nota (opcional)" rows={2} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
        {editor.dirty ? <p className="text-xs text-warning">Tienes cambios sin guardar: se guardarán como borrador antes de programar.</p> : null}
        <section aria-label="Programaciones pendientes">
          <h3 className="mb-2 text-sm">Programaciones pendientes</h3>
          {scheduled.length === 0 ? (
            <p className="text-sm text-muted">No hay publicaciones programadas.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {scheduled.map((s) => (
                <li key={s.versionId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    v{s.number} · <DateTime value={s.publishAt} />
                  </span>
                  <Button size="sm" variant="danger" onClick={() => void editor.cancelSchedule(s.versionId)}>
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function HistoryDrawer({ kind, docKey, editor, open, onClose }: { kind: ContentKind; docKey: string; editor: DocumentEditor; open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<VersionSummary | null>(null);
  const versions = useVersions(kind, docKey, page, open);

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Historial de versiones" description="Versiones publicadas, programadas y anteriores. Restaurar copia la versión al borrador, no la publica." width={520}>
        {versions.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="text-sm text-danger">{errorMessage(versions.error)}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2" data-testid="version-list">
              {versions.data.items.map((v) => (
                <li key={v.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Versión {v.number}</span>
                      <Badge tone={STATUS[v.status].tone}>{STATUS[v.status].label}</Badge>
                    </div>
                    <span className="text-xs text-muted">
                      <DateTime value={v.status === "scheduled" ? v.publishAt : (v.publishedAt ?? v.createdAt)} />
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {v.note ? `“${v.note}” · ` : ""}
                    {v.authorId ? `Autor ${v.authorId.slice(-6)}` : "Sistema"}
                    {v.status === "scheduled" ? " · se publicará en la fecha indicada" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setViewing(v)}>
                      Ver
                    </Button>
                    {editor.canWrite && v.status !== "cancelled" && v.status !== "scheduled" ? <RestoreButton editor={editor} version={v} onDone={onClose} /> : null}
                    {editor.canPublish && v.status === "scheduled" ? (
                      <Button size="sm" variant="danger" onClick={() => void editor.cancelSchedule(v.id)}>
                        Cancelar programación
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {versions.data.totalPages > 1 ? <Pagination page={page} pageSize={15} total={versions.data.total} onPageChange={setPage} pageSizes={[15]} className="mt-3" /> : null}
          </>
        )}
      </Drawer>
      {viewing ? <VersionDialog kind={kind} docKey={docKey} editor={editor} version={viewing} onClose={() => setViewing(null)} onRestored={() => { setViewing(null); onClose(); }} /> : null}
    </>
  );
}

function RestoreButton({ editor, version, onDone }: { editor: DocumentEditor; version: VersionSummary; onDone: () => void }) {
  const confirm = useConfirm();
  return (
    <Button
      size="sm"
      leftIcon={<RotateCcw aria-hidden size={14} />}
      loading={editor.restoring}
      onClick={async () => {
        const ok = await confirm({
          title: `¿Restaurar la versión ${version.number}?`,
          description: editor.dirty ? "El borrador actual (incluidos los cambios sin guardar) se reemplazará por esta versión. No se publica hasta que lo hagas tú." : "El borrador actual se reemplazará por esta versión. No se publica hasta que lo hagas tú.",
          confirmLabel: "Restaurar al borrador",
          tone: "danger",
        });
        if (ok && (await editor.restore(version.id))) onDone();
      }}
    >
      Restaurar
    </Button>
  );
}

function VersionDialog({ kind, docKey, editor, version, onClose, onRestored }: { kind: ContentKind; docKey: string; editor: DocumentEditor; version: VersionSummary; onClose: () => void; onRestored: () => void }) {
  const typeLabel = useSectionTypeLabel();
  const detail = useVersion(kind, docKey, version.id);
  const [raw, setRaw] = useState(false);
  const entries = useMemo(() => {
    if (!detail.data || !editor.data) return [];
    return diffDocument(kind, editor.data, detail.data.data, typeLabel);
  }, [detail.data, editor.data, kind, typeLabel]);
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Versión ${version.number}`}
      description="Diferencias entre tu borrador actual y esta versión (lo que cambiaría al restaurarla)."
      footer={
        <>
          <Button onClick={() => setRaw((r) => !r)}>{raw ? "Ver diferencias" : "Ver contenido completo"}</Button>
          <Button onClick={onClose}>Cerrar</Button>
          {editor.canWrite && version.status !== "cancelled" && version.status !== "scheduled" ? <RestoreButton editor={editor} version={version} onDone={onRestored} /> : null}
        </>
      }
    >
      {detail.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner size={14} /> Cargando versión…
        </div>
      ) : detail.isError ? (
        <p className="text-sm text-danger">{errorMessage(detail.error)}</p>
      ) : raw ? (
        <JsonView value={detail.data.data} maxHeight={420} />
      ) : (
        <DiffView entries={entries} emptyText="Tu borrador es idéntico a esta versión." />
      )}
    </Dialog>
  );
}
