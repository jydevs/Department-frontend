"use client";
import { CalendarClock, History, RotateCcw, Save, Send, Undo2, X } from "lucide-react";
import { useState } from "react";
import { useUnsavedGuard } from "@/components/admin/shell/useUnsavedGuard";
import { Button } from "@/components/admin/ui/Button";
import { Badge, DateTime, JsonView, Pagination, Spinner, StatusBadge } from "@/components/admin/ui/Display";
import { DateTimeInput, Input } from "@/components/admin/ui/Form";
import { Dialog, Drawer, useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { DocChanged, diffJson, docStatus, fetchDocFresh, useCancelSchedule, useDiscard, usePublish, useRestoreVersion, useSchedule, useVersion, useVersions, type CmsDoc, type JsonValue } from "@/lib/admin/api/content";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import type { Draft } from "./useDraft";

interface Props { doc: CmsDoc; draft: Draft; invalidCount: number }
const VERSION_STATUS = { published: ["Publicada", "ok"], scheduled: ["Programada", "info"], superseded: ["Reemplazada", "neutral"], cancelled: ["Cancelada", "neutral"] } as const;
type Review = { fresh: CmsDoc } | null;

/**
 * Barra de publicación: borrador (autosave serializado), descartar, publicar, programar, historial y diff.
 * Publicar/Programar: 1) esperan al guardado pendiente, 2) releen el documento del servidor y comparan `version` con la del editor
 * (si difiere → conflicto con diff y NO se publica), 3) piden revisión (diff contra lo publicado, con el borrador DEL SERVIDOR), 4) publican.
 */
export function PublishBar({ doc, draft: d, invalidCount }: Props) {
  const canPub = useCan("content:publish"), canWrite = useCan("content:write");
  const confirm = useConfirm(), toast = useToast();
  const publish = usePublish(), discard = useDiscard(), schedule = useSchedule(), cancel = useCancelSchedule(), restore = useRestoreVersion();
  const [hist, setHist] = useState(false), [sch, setSch] = useState(false), [when, setWhen] = useState<string | null>(null);
  const [note, setNote] = useState(""), [page, setPage] = useState(1), [schErr, setSchErr] = useState<string | undefined>();
  const [view, setView] = useState<string | null>(null);
  const [review, setReview] = useState<Review>(null), [busy, setBusy] = useState(false);
  const [stale, setStale] = useState<CmsDoc | null>(null), [keptView, setKeptView] = useState(false);
  const status = docStatus(doc);
  const neverPublished = doc.publishedAt === null;
  useUnsavedGuard(d.dirty, "Los últimos cambios aún no se han guardado como borrador. Si sales ahora se perderán.");
  const publishedData = useVersion(doc.kind, doc.key, review ? doc.publishedVersionId : null);
  const versions = useVersions(doc.kind, doc.key, page, hist);
  const viewed = useVersion(doc.kind, doc.key, view);
  const working = busy || d.saving || publish.isPending || schedule.isPending;
  const canSave = d.dirty && invalidCount === 0 && !d.conflict;

  /** Guarda lo pendiente y relee el servidor: `null` si no se puede continuar (error o documento cambiado por otra persona). */
  const prepare = async (): Promise<CmsDoc | null> => {
    if (invalidCount > 0) return null;
    setBusy(true);
    try {
      if (d.dirty || d.saving) await d.flush();
      const fresh = await fetchDocFresh(doc.kind, doc.key);
      if (fresh.version !== d.getVersion()) { setStale(fresh); return null; }
      return fresh;
    } catch (e) {
      if ((e instanceof ApiError && e.code === "CONCURRENT_UPDATE") || (e instanceof Error && /Otra persona/.test(e.message))) await openConflict();
      else toast.error(errorMessage(e));
      return null;
    } finally { setBusy(false); }
  };
  const openConflict = async () => {
    try { setStale(await fetchDocFresh(doc.kind, doc.key)); } catch (e) { toast.error(errorMessage(e)); }
  };
  const startPublish = async () => { const fresh = await prepare(); if (fresh) { setNote(""); setReview({ fresh }); } };
  const doPublish = async () => {
    if (!review) return;
    try {
      // lo que se revisó es la versión `review.fresh.version`: si cambió (guardado local posterior u otra persona) se vuelve a revisar
      if (d.dirty) await d.flush();
      await publish.mutateAsync({ kind: doc.kind, key: doc.key, note, expectedVersion: d.getVersion() });
      setReview(null); setNote("");
    } catch (e) {
      if (e instanceof DocChanged) { setReview(null); setStale(e.fresh); }
      else toast.error(errorMessage(e));
    }
  };
  const startSchedule = async () => { setWhen(null); setSchErr(undefined); setNote(""); setSch(true); };
  const doSchedule = async () => {
    if (!when) return;
    if (new Date(when).getTime() < Date.now() + 60_000) { setSchErr("Debe ser al menos 1 minuto en el futuro"); return; }
    const fresh = await prepare();
    if (!fresh) { setSch(false); return; }
    try { await schedule.mutateAsync({ kind: doc.kind, key: doc.key, at: when, note, expectedVersion: d.getVersion() }); setSch(false); setNote(""); }
    catch (e) { if (e instanceof DocChanged) { setSch(false); setStale(e.fresh); } else toast.error(errorMessage(e)); }
  };
  const serverVsLocal = stale ? diffJson(stale.draft, d.local) : [];
  const reloadServer = async () => { if (!stale) return; d.reset(stale, { keepLocal: true }); setStale(null); toast.success("Se cargó la versión del servidor. Tus cambios locales se conservaron: puedes recuperarlos."); };
  const askReload = async () => {
    if (!d.dirty) { // nada local que perder
      try { d.reset(await fetchDocFresh(doc.kind, doc.key)); } catch (e) { toast.error(errorMessage(e)); }
      return;
    }
    await openConflict();
  };

  return (
    <div className="sticky top-14 z-10 mb-4 rounded-sm border border-line bg-surface/95 p-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={status === "scheduled" ? "scheduled" : neverPublished ? "draft" : "published"} />
          {status === "dirty" && <Badge tone="warn">Borrador sin publicar</Badge>}
          {doc.scheduled.map((s) => (
            <span key={s.versionId} className="inline-flex items-center gap-1"><Badge tone="info">Se publica <DateTime value={s.publishAt} /></Badge>
              {canPub && <button type="button" aria-label="Cancelar programación" title="Cancelar programación" className="rounded-sm p-1.5 text-muted hover:bg-surface2" onClick={async () => { if (await confirm({ title: "Cancelar programación", message: "La publicación programada se cancelará: el contenido no se publicará en esa fecha.", danger: true, confirmLabel: "Cancelar programación" })) cancel.mutate({ kind: doc.kind, key: doc.key, versionId: s.versionId }); }}><X className="size-3.5" /></button>}</span>
          ))}
          <span role="status" className="text-xs text-muted">{d.saving ? "Guardando…" : invalidCount > 0 ? "Corrige los errores para poder guardar" : d.error && d.dirty ? `No se pudo guardar: ${d.error}` : d.dirty ? "Cambios sin guardar (autoguardado en 3 s)" : "Borrador guardado"}</span>
          {invalidCount > 0 && <Badge tone="danger">{invalidCount} errores de validación</Badge>}
        </div>
        <Button size="sm" icon={<History className="size-3.5" />} onClick={() => { setPage(1); setHist(true); }}>Historial</Button>
        {canWrite && <>
          {!neverPublished && <Button size="sm" icon={<Undo2 className="size-3.5" />} loading={discard.isPending} disabled={(!d.dirty && !doc.dirty) || working} onClick={async () => { if (await confirm({ title: "Descartar cambios", message: "El borrador volverá a la última versión publicada.", danger: true, confirmLabel: "Descartar" })) { await d.settle(); discard.mutate({ kind: doc.kind, key: doc.key }, { onSuccess: (r) => d.reset(r) }); } }}>Descartar</Button>}
          <Button size="sm" icon={<Save className="size-3.5" />} loading={d.saving} disabled={!canSave} onClick={() => void d.flush().catch(() => undefined)}>Guardar borrador</Button>
        </>}
        {canPub && <>
          <Button size="sm" icon={<CalendarClock className="size-3.5" />} disabled={invalidCount > 0 || d.conflict || working} onClick={() => void startSchedule()}>Programar</Button>
          <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} loading={working} disabled={invalidCount > 0 || d.conflict || working || (!d.dirty && !doc.dirty && !neverPublished)} onClick={() => void startPublish()}>Publicar</Button>
        </>}
      </div>
      {d.conflict && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-accent/50 bg-accent/10 p-2 text-sm">
          <span className="flex-1">Otra persona modificó este documento mientras lo editabas. Tus cambios no se guardaron (siguen aquí).</span>
          <Button size="sm" onClick={() => void askReload()}>Revisar y recargar la versión del servidor</Button>
        </div>
      )}
      {d.kept !== null && (
        <div role="status" className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface2 p-2 text-sm">
          <span className="flex-1">Se cargó la versión del servidor. Tus cambios locales no se perdieron: están guardados aparte en este navegador.</span>
          <Button size="sm" onClick={() => setKeptView(true)}>Ver mis cambios</Button>
          <Button size="sm" variant="primary" onClick={() => d.restoreKept()}>Recuperar mis cambios</Button>
          <Button size="sm" variant="ghost" onClick={() => d.dismissKept()}>Descartarlos</Button>
        </div>
      )}
      {d.issues.length > 0 && (
        <div role="alert" className="mt-2 rounded-sm border border-accent/50 bg-accent/10 p-2 text-xs">
          <p className="mb-1 font-medium">El servidor rechazó el contenido:</p>
          <ul className="list-inside list-disc">{d.issues.slice(0, 8).map((i, k) => <li key={k}><code>{i.path || "(documento)"}</code>: {i.message}</li>)}</ul>
        </div>
      )}

      <Dialog open={!!review} onClose={() => setReview(null)} title={neverPublished ? "Primera publicación" : "Revisar cambios antes de publicar"} size="lg"
        footer={<><Button onClick={() => setReview(null)}>Cancelar</Button><Button variant="primary" loading={publish.isPending} disabled={publishedData.isLoading || publish.isPending} onClick={() => void doPublish()}>{neverPublished ? "Publicar por primera vez" : "Publicar ahora"}</Button></>}>
        {review && <>
          {neverPublished && <p role="alert" className="mb-3 rounded-sm border border-accent/50 bg-accent/10 p-2 text-sm">Este documento nunca se ha publicado. Al confirmar quedará visible en la tienda.</p>}
          <p className="mb-2 text-xs text-muted">Se publicará el borrador guardado en el servidor (versión {review.fresh.version}){neverPublished ? "." : " frente a la versión publicada:"}</p>
          {!neverPublished && (publishedData.isLoading ? <Spinner /> : <DiffTable rows={diffJson(publishedData.data?.data ?? null, review.fresh.draft)} />)}
          {neverPublished && <DiffTable rows={diffJson({}, review.fresh.draft)} before="Publicado" after="Se publicará" />}
          {diffJson(review.fresh.draft, d.local).length > 0 && <p role="alert" className="mt-3 text-xs text-accent-text">Tu editor tiene {diffJson(review.fresh.draft, d.local).length} diferencia(s) que no están en el borrador del servidor; se guardarán antes de publicar.</p>}
          <div className="mt-3"><Input label="Nota de la versión (opcional)" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </>}
      </Dialog>
      <Dialog open={sch} onClose={() => setSch(false)} title="Programar publicación" size="sm"
        footer={<><Button onClick={() => setSch(false)}>Cancelar</Button><Button variant="primary" loading={schedule.isPending || busy} disabled={!when || working} onClick={() => void doSchedule()}>Programar</Button></>}>
        <DateTimeInput label="Fecha y hora" value={when} onChange={(v) => { setSchErr(undefined); setWhen(v); }} error={schErr} />
        <div className="mt-3"><Input label="Nota (opcional)" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <p className="mt-2 text-xs text-muted">Se guardará tu borrador y esa copia se publicará automáticamente en ese momento.{neverPublished ? " Este documento nunca se ha publicado: será su primera publicación." : ""}</p>
      </Dialog>
      <Dialog open={!!stale} onClose={() => setStale(null)} title="El documento cambió en el servidor" size="lg"
        footer={<><Button onClick={() => setStale(null)}>Cerrar (seguir editando)</Button><Button variant="danger" onClick={() => void reloadServer()}>{d.dirty ? "Cargar la versión del servidor (mis cambios se conservan aparte)" : "Cargar la versión del servidor"}</Button></>}>
        {stale && <>
          <p role="alert" className="mb-3 text-sm">Otra persona guardó este documento (versión {stale.version}; tú editas la {d.version}). <b>No se publicó nada.</b> {serverVsLocal.length ? "Estas son las diferencias entre el servidor y tu editor:" : "Tu editor coincide con el servidor."}</p>
          <DiffTable rows={serverVsLocal} before="Servidor" after="Tu editor" />
          <p className="mt-3 text-xs text-muted">Al cargar la versión del servidor, tus cambios locales no se pierden: quedan disponibles para recuperarlos.</p>
        </>}
      </Dialog>
      <Dialog open={keptView} onClose={() => setKeptView(false)} title="Tus cambios conservados" size="lg" footer={<Button onClick={() => setKeptView(false)}>Cerrar</Button>}>
        <DiffTable rows={d.kept === null ? [] : diffJson(d.local, d.kept)} before="Servidor" after="Tus cambios" />
      </Dialog>
      <Drawer open={hist} onClose={() => { setHist(false); setView(null); }} title="Historial de versiones">
        {versions.isLoading && <Spinner />}
        {versions.error && <p role="alert" className="text-sm text-accent-text">No se pudo cargar el historial.</p>}
        {versions.data?.items.length === 0 && <p className="text-sm text-muted">Aún no hay versiones publicadas.</p>}
        <ul className="space-y-2">{versions.data?.items.map((v) => {
          const [label, tone] = VERSION_STATUS[v.status];
          return (
            <li key={v.id} className="rounded-sm border border-line p-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-medium">Versión {v.number} <Badge tone={tone}>{label}</Badge></span><DateTime value={v.publishedAt ?? v.publishAt ?? v.createdAt} /></div>
              {v.note && <p className="text-xs text-muted">{v.note}</p>}
              <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => setView(view === v.id ? null : v.id)}>{view === v.id ? "Ocultar" : "Ver diff vs. borrador"}</Button>
                {canWrite && <Button size="sm" icon={<RotateCcw className="size-3.5" />} loading={restore.isPending} onClick={async () => { if (await confirm({ title: "Restaurar versión", message: `El borrador se reemplazará por la versión ${v.number}${d.dirty ? " y se perderán los cambios locales sin guardar" : ""}.`, confirmLabel: "Restaurar" })) { await d.settle(); restore.mutate({ kind: doc.kind, key: doc.key, versionId: v.id }, { onSuccess: (r) => { d.reset(r); setHist(false); } }); } }}>Restaurar</Button>}</div>
              {view === v.id && <div className="mt-2">{viewed.isLoading ? <Spinner /> : viewed.data && (<><DiffTable rows={diffJson(viewed.data.data, d.local)} />{diffJson(viewed.data.data, d.local).length === 0 && <JsonView value={viewed.data.data as JsonValue} />}</>)}</div>}
            </li>);
        })}</ul>
        {versions.data && versions.data.totalPages > 1 && <div className="mt-3"><Pagination page={page} totalPages={versions.data.totalPages} total={versions.data.total} onChange={setPage} /></div>}
      </Drawer>
    </div>
  );
}

export function DiffTable({ rows, before = "Antes", after = "Después" }: { rows: { path: string; before: string; after: string }[]; before?: string; after?: string }) {
  if (!rows.length) return <p className="text-sm text-muted">Sin diferencias.</p>;
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Claves cambiadas</caption>
      <thead className="text-muted"><tr><th scope="col" className="py-1 pr-2">Clave</th><th scope="col" className="pr-2">{before}</th><th scope="col">{after}</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.path} className="border-t border-line align-top"><th scope="row" className="py-1.5 pr-2 font-mono font-normal">{r.path}</th><td className="max-w-40 break-words pr-2 text-accent-text">{r.before.slice(0, 120)}</td><td className="max-w-40 break-words text-ok">{r.after.slice(0, 120)}</td></tr>)}</tbody>
    </table>
  );
}
