"use client";
import { CalendarClock, History, RotateCcw, Save, Send, Undo2, X } from "lucide-react";
import { useState } from "react";
import { useUnsavedGuard } from "@/components/admin/shell/useUnsavedGuard";
import { Button } from "@/components/admin/ui/Button";
import { Badge, DateTime, JsonView, Spinner, StatusBadge } from "@/components/admin/ui/Display";
import { DateTimeInput, Input } from "@/components/admin/ui/Form";
import { Dialog, Drawer, useConfirm } from "@/components/admin/ui/Overlay";
import { Pagination } from "@/components/admin/ui/Display";
import { diffJson, docStatus, useCancelSchedule, useDiscard, usePublish, useRestoreVersion, useSchedule, useDoc, useVersion, useVersions, type CmsDoc, type JsonValue } from "@/lib/admin/api/content";
import { useCan } from "@/lib/admin/permissions";

interface Props {
  doc: CmsDoc; local: JsonValue; dirty: boolean; saving: boolean; invalidCount: number; conflict?: boolean; issues?: { path: string; message: string }[];
  onSave: () => Promise<void>; onReset: (d: CmsDoc) => void;
}
const VERSION_STATUS = { published: ["Publicada", "ok"], scheduled: ["Programada", "info"], superseded: ["Reemplazada", "neutral"], cancelled: ["Cancelada", "neutral"] } as const;

/** Barra de publicación: borrador (autosave), descartar, publicar, programar, historial y diff. */
export function PublishBar({ doc, local, dirty, saving, invalidCount, conflict, issues = [], onSave, onReset }: Props) {
  const canPub = useCan("content:publish"), canWrite = useCan("content:write");
  const confirm = useConfirm();
  const publish = usePublish(), discard = useDiscard(), schedule = useSchedule(), cancel = useCancelSchedule(), restore = useRestoreVersion();
  const [hist, setHist] = useState(false), [sch, setSch] = useState(false), [when, setWhen] = useState<string | null>(null), [diff, setDiff] = useState(false);
  const [note, setNote] = useState(""), [page, setPage] = useState(1), [schErr, setSchErr] = useState<string | undefined>();
  const [view, setView] = useState<string | null>(null);
  const status = docStatus(doc);
  useUnsavedGuard(dirty, "Los últimos cambios aún no se han guardado como borrador. Si sales ahora se perderán.");
  const publishedData = useVersion(doc.kind, doc.key, diff ? doc.publishedVersionId : null);
  const versions = useVersions(doc.kind, doc.key, page, hist);
  const viewed = useVersion(doc.kind, doc.key, view);
  const changes = diffJson(publishedData.data?.data ?? null, local);
  const live = useDoc(doc.kind, doc.key);
  const reload = async () => { const r = await live.refetch(); if (r.data) onReset(r.data); };
  const doPublish = async () => {
    if (invalidCount > 0) return;
    if (dirty) { try { await onSave(); } catch { return; } } // publica solo tras guardar el borrador
    publish.mutate({ kind: doc.kind, key: doc.key, note }, { onSuccess: () => setNote("") });
  };
  const canSave = dirty && invalidCount === 0 && !conflict;
  return (
    <div className="sticky top-14 z-10 mb-4 rounded-sm border border-line bg-surface/95 p-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={status === "scheduled" ? "scheduled" : doc.publishedAt === null ? "draft" : "published"} />
          {status === "dirty" && <Badge tone="warn">Borrador sin publicar</Badge>}
          {doc.scheduled.map((s) => (
            <span key={s.versionId} className="inline-flex items-center gap-1"><Badge tone="info">Se publica <DateTime value={s.publishAt} /></Badge>
              {canPub && <button type="button" aria-label="Cancelar programación" title="Cancelar programación" className="rounded-sm p-1 text-muted hover:bg-surface2" onClick={() => cancel.mutate({ kind: doc.kind, key: doc.key, versionId: s.versionId })}><X className="size-3.5" /></button>}</span>
          ))}
          <span role="status" className="text-xs text-muted">{saving ? "Guardando…" : invalidCount > 0 ? "Corrige los errores para poder guardar" : dirty ? "Cambios sin guardar (autoguardado en 3 s)" : "Borrador guardado"}</span>
          {invalidCount > 0 && <Badge tone="danger">{invalidCount} errores de validación</Badge>}
        </div>
        <Button size="sm" icon={<History className="size-3.5" />} onClick={() => { setPage(1); setHist(true); }}>Historial</Button>
        {canWrite && <>
          {doc.publishedAt !== null && <Button size="sm" icon={<Undo2 className="size-3.5" />} loading={discard.isPending} disabled={!dirty && !doc.dirty} onClick={async () => { if (await confirm({ title: "Descartar cambios", message: "El borrador volverá a la última versión publicada.", danger: true, confirmLabel: "Descartar" })) discard.mutate({ kind: doc.kind, key: doc.key }, { onSuccess: onReset }); }}>Descartar</Button>}
          <Button size="sm" icon={<Save className="size-3.5" />} loading={saving} disabled={!canSave} onClick={() => void onSave().catch(() => undefined)}>Guardar borrador</Button>
        </>}
        {canPub && <>
          <Button size="sm" icon={<CalendarClock className="size-3.5" />} disabled={invalidCount > 0 || !!conflict} onClick={() => { setWhen(null); setSchErr(undefined); setSch(true); }}>Programar</Button>
          <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} loading={publish.isPending} disabled={invalidCount > 0 || !!conflict || (!dirty && !doc.dirty && doc.publishedAt !== null)} onClick={() => (doc.publishedAt !== null ? setDiff(true) : void doPublish())}>Publicar</Button>
        </>}
      </div>
      {conflict && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-accent/50 bg-accent/10 p-2 text-sm">
          <span className="flex-1">Otra persona modificó este documento mientras lo editabas. Tus cambios no se guardaron.</span>
          <Button size="sm" onClick={() => void reload()}>Recargar la versión del servidor</Button>
        </div>
      )}
      {issues.length > 0 && (
        <div role="alert" className="mt-2 rounded-sm border border-accent/50 bg-accent/10 p-2 text-xs">
          <p className="mb-1 font-medium">El servidor rechazó el contenido:</p>
          <ul className="list-inside list-disc">{issues.slice(0, 8).map((i, k) => <li key={k}><code>{i.path || "(documento)"}</code>: {i.message}</li>)}</ul>
        </div>
      )}

      <Dialog open={diff} onClose={() => setDiff(false)} title="Revisar cambios antes de publicar" size="lg"
        footer={<><Button onClick={() => setDiff(false)}>Cancelar</Button><Button variant="primary" loading={publish.isPending} disabled={publishedData.isLoading} onClick={() => { setDiff(false); void doPublish(); }}>Publicar ahora</Button></>}>
        {publishedData.isLoading ? <Spinner /> : <DiffTable rows={changes} />}
        <div className="mt-3"><Input label="Nota de la versión (opcional)" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </Dialog>
      <Dialog open={sch} onClose={() => setSch(false)} title="Programar publicación" size="sm"
        footer={<><Button onClick={() => setSch(false)}>Cancelar</Button><Button variant="primary" loading={schedule.isPending} disabled={!when} onClick={async () => { if (!when) return; if (new Date(when).getTime() < Date.now() + 60_000) { setSchErr("Debe ser al menos 1 minuto en el futuro"); return; } if (dirty) { try { await onSave(); } catch { return; } } schedule.mutate({ kind: doc.kind, key: doc.key, at: when, note }, { onSuccess: () => { setSch(false); setNote(""); } }); }}>Programar</Button></>}>
        <DateTimeInput label="Fecha y hora (hora local)" value={when} onChange={(v) => { setSchErr(undefined); setWhen(v); }} error={schErr} />
        <div className="mt-3"><Input label="Nota (opcional)" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <p className="mt-2 text-xs text-muted">Se guardará tu borrador y esa copia se publicará automáticamente en ese momento.</p>
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
                {canWrite && <Button size="sm" icon={<RotateCcw className="size-3.5" />} loading={restore.isPending} onClick={async () => { if (await confirm({ title: "Restaurar versión", message: `El borrador se reemplazará por la versión ${v.number}.`, confirmLabel: "Restaurar" })) restore.mutate({ kind: doc.kind, key: doc.key, versionId: v.id }, { onSuccess: (d) => { onReset(d); setHist(false); } }); }}>Restaurar</Button>}</div>
              {view === v.id && <div className="mt-2">{viewed.isLoading ? <Spinner /> : viewed.data && (<><DiffTable rows={diffJson(viewed.data.data, local)} />{diffJson(viewed.data.data, local).length === 0 && <JsonView value={viewed.data.data} />}</>)}</div>}
            </li>);
        })}</ul>
        {versions.data && versions.data.totalPages > 1 && <div className="mt-3"><Pagination page={page} totalPages={versions.data.totalPages} total={versions.data.total} onChange={setPage} /></div>}
      </Drawer>
    </div>
  );
}

export function DiffTable({ rows }: { rows: { path: string; before: string; after: string }[] }) {
  if (!rows.length) return <p className="text-sm text-muted">Sin diferencias.</p>;
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Claves cambiadas</caption>
      <thead className="text-muted"><tr><th scope="col" className="py-1 pr-2">Clave</th><th scope="col" className="pr-2">Antes</th><th scope="col">Después</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.path} className="border-t border-line align-top"><th scope="row" className="py-1.5 pr-2 font-mono font-normal">{r.path}</th><td className="max-w-40 break-words pr-2 text-accent-text">{r.before.slice(0, 120)}</td><td className="max-w-40 break-words text-ok">{r.after.slice(0, 120)}</td></tr>)}</tbody>
    </table>
  );
}
