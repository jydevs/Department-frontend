"use client";
import { CalendarClock, History, RotateCcw, Save, Send, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, DateTime, JsonView, StatusBadge } from "@/components/admin/ui/Display";
import { DateTimeInput } from "@/components/admin/ui/Form";
import { Dialog, Drawer, useConfirm } from "@/components/admin/ui/Overlay";
import { diffJson, docStatus, useCancelSchedule, useDiscard, usePublish, useRestoreVersion, useSchedule } from "@/lib/admin/api/content";
import { useCan } from "@/lib/admin/permissions";
import type { ContentDoc, JsonValue } from "@/lib/admin/types";

interface Props { doc: ContentDoc; local: JsonValue; dirty: boolean; saving: boolean; invalidCount: number; onSave: () => void; onReset: (c: JsonValue) => void }

/** Barra de publicación: borrador (autosave), descartar, publicar, programar, historial y diff. */
export function PublishBar({ doc, local, dirty, saving, invalidCount, onSave, onReset }: Props) {
  const canPub = useCan("content:publish"), canWrite = useCan("content:write");
  const confirm = useConfirm();
  const publish = usePublish(), discard = useDiscard(), schedule = useSchedule(), cancel = useCancelSchedule(), restore = useRestoreVersion();
  const [hist, setHist] = useState(false), [sch, setSch] = useState(false), [when, setWhen] = useState<string | null>(null), [diff, setDiff] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const status = docStatus(doc);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  const changes = diffJson(doc.published, local);
  const doPublish = async () => {
    if (invalidCount > 0) return;
    if (dirty) onSave();
    publish.mutate({ kind: doc.kind, key: doc.key });
  };
  return (
    <div className="sticky top-14 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface/95 p-2.5 backdrop-blur">
      <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={status === "scheduled" ? "scheduled" : doc.published === null ? "draft" : "published"} />
        {status === "dirty" && <Badge tone="warn">Borrador sin publicar</Badge>}
        {doc.scheduledAt && <Badge tone="info">Se publica <DateTime value={doc.scheduledAt} /></Badge>}
        <span role="status" className="text-xs text-muted">{saving ? "Guardando…" : dirty ? "Cambios sin guardar (autoguardado en 3 s)" : "Borrador guardado"}</span>
        {invalidCount > 0 && <Badge tone="danger">{invalidCount} errores de validación</Badge>}
      </div>
      <Button size="sm" icon={<History className="size-3.5" />} onClick={() => setHist(true)}>Historial</Button>
      {canWrite && <>
        {doc.published !== null && <Button size="sm" icon={<Undo2 className="size-3.5" />} disabled={!dirty && !doc.dirty} onClick={async () => { if (await confirm({ title: "Descartar cambios", message: "El borrador volverá a la última versión publicada.", danger: true, confirmLabel: "Descartar" })) discard.mutate({ kind: doc.kind, key: doc.key }, { onSuccess: () => onReset(doc.published as JsonValue) }); }}>Descartar</Button>}
        <Button size="sm" icon={<Save className="size-3.5" />} loading={saving} disabled={!dirty} onClick={onSave}>Guardar borrador</Button>
      </>}
      {canPub && <>
        {doc.scheduledAt ? <Button size="sm" onClick={() => cancel.mutate({ kind: doc.kind, key: doc.key })}>Cancelar programación</Button> : <Button size="sm" icon={<CalendarClock className="size-3.5" />} disabled={invalidCount > 0} onClick={() => { setWhen(null); setSch(true); }}>Programar</Button>}
        <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} loading={publish.isPending} disabled={invalidCount > 0 || (!dirty && !doc.dirty && doc.published !== null)} onClick={() => (doc.published !== null ? setDiff(true) : void doPublish())}>Publicar</Button>
      </>}

      <Dialog open={diff} onClose={() => setDiff(false)} title="Revisar cambios antes de publicar" size="lg"
        footer={<><Button onClick={() => setDiff(false)}>Cancelar</Button><Button variant="primary" loading={publish.isPending} onClick={() => { setDiff(false); void doPublish(); }}>Publicar ahora</Button></>}>
        <DiffTable rows={changes} />
      </Dialog>
      <Dialog open={sch} onClose={() => setSch(false)} title="Programar publicación" size="sm"
        footer={<><Button onClick={() => setSch(false)}>Cancelar</Button><Button variant="primary" loading={schedule.isPending} disabled={!when} onClick={() => when && schedule.mutate({ kind: doc.kind, key: doc.key, at: when }, { onSuccess: () => setSch(false) })}>Programar</Button></>}>
        <DateTimeInput label="Fecha y hora (hora local)" value={when} onChange={setWhen} />
        <p className="mt-2 text-xs text-muted">Se publicará el borrador guardado en ese momento.</p>
      </Dialog>
      <Drawer open={hist} onClose={() => { setHist(false); setView(null); }} title="Historial de versiones">
        {doc.versions.length === 0 && <p className="text-sm text-muted">Aún no hay versiones publicadas.</p>}
        <ul className="space-y-2">{doc.versions.map((v) => (
          <li key={v.id} className="rounded-sm border border-line p-3 text-sm">
            <div className="flex items-center justify-between"><span className="font-medium">Versión {v.number}</span><DateTime value={v.at} /></div>
            <p className="text-xs text-muted">{v.actor}</p>
            <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => setView(view === v.id ? null : v.id)}>{view === v.id ? "Ocultar" : "Ver diff vs. borrador"}</Button>
              {canWrite && <Button size="sm" icon={<RotateCcw className="size-3.5" />} loading={restore.isPending} onClick={async () => { if (await confirm({ title: "Restaurar versión", message: `El borrador se reemplazará por la versión ${v.number}.`, confirmLabel: "Restaurar" })) restore.mutate({ kind: doc.kind, key: doc.key, versionId: v.id }, { onSuccess: () => { onReset(v.content); setHist(false); } }); }}>Restaurar</Button>}</div>
            {view === v.id && <div className="mt-2"><DiffTable rows={diffJson(v.content, local)} />{diffJson(v.content, local).length === 0 && <JsonView value={v.content} />}</div>}
          </li>))}</ul>
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
