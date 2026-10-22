"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { Badge, Button, DataTable, DateTime, Drawer, ErrorState, Skeleton, useConfirm, useToast } from "@/components/admin/ui";
import { Notice, apiMessage } from "@/components/admin/settings/shared";

import { formatNumber } from "@/lib/admin/format";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_TONES, IMPORT_TYPE_LABELS, ROW_ERROR_LABELS, isActiveJob, useCancelImport, useImportJob, type ImportJobDetail, type ImportRowError } from "@/lib/admin/api/imports";

function Counter({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={tone === "danger" && value > 0 ? "text-xl font-semibold text-danger tabular-nums" : "text-xl font-semibold tabular-nums"}>{formatNumber(value)}</dd>
    </div>
  );
}

function Body({ job }: { job: ImportJobDetail }) {
  const active = isActiveJob(job.status);
  const pct = Math.max(0, Math.min(100, job.progressPercent));
  const errorsCols = [
    { key: "row", header: "Fila", width: "70px", cell: (e: ImportRowError) => (e.row === 0 ? "Archivo" : String(e.row)) },
    { key: "code", header: "Código", cell: (e: ImportRowError) => (
        <div>
          <p className="text-[13px]">{ROW_ERROR_LABELS[e.code] ?? e.code}</p>
          <code className="font-mono text-[11px] text-muted">{e.code}</code>
        </div>
      ),
    },
    { key: "msg", header: "Mensaje", cell: (e: ImportRowError) => <span className="text-[13px] break-words">{e.message}</span> },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={IMPORT_STATUS_TONES[job.status]} dot>{IMPORT_STATUS_LABELS[job.status]}</Badge>
        <Badge tone={job.dryRun ? "info" : "neutral"}>{job.dryRun ? "Simulación" : "Importación real"}</Badge>
        <span className="text-muted">{IMPORT_TYPE_LABELS[job.type]}</span>
      </div>
      {job.dryRun && job.status === "done" ? <Notice>Fue una simulación: no se guardó ningún dato. Los contadores indican lo que habría ocurrido.</Notice> : null}
      <div>
        <div className="mb-1.5 flex justify-between text-[13px]">
          <span>
            {formatNumber(job.processedRows)} de {formatNumber(job.totalRows)} filas
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso de la importación" className="h-2.5 overflow-hidden rounded-full bg-surface-3">
          <div className={job.status === "failed" ? "h-full bg-danger" : job.status === "done" ? "h-full bg-success" : "h-full bg-accent"} style={{ width: `${pct}%`, transition: "width .4s" }} />
        </div>
        {active ? <p className="mt-1.5 text-xs text-muted" aria-live="polite">Actualizando cada 2 segundos…</p> : null}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Creados" value={job.createdCount} />
        <Counter label="Actualizados" value={job.updatedCount} />
        <Counter label="Omitidos" value={job.skippedCount} />
        <Counter label="Errores" value={job.errorCount} tone="danger" />
      </dl>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted">Archivo</dt>
        <dd className="break-all">{job.fileName}</dd>
        <dt className="text-muted">Creado</dt>
        <dd><DateTime value={job.createdAt} /></dd>
        <dt className="text-muted">Inicio</dt>
        <dd><DateTime value={job.startedAt} /></dd>
        <dt className="text-muted">Fin</dt>
        <dd><DateTime value={job.finishedAt} /></dd>
        <dt className="text-muted">SHA-256</dt>
        <dd className="font-mono text-xs break-all">{job.fileSha256}</dd>
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-medium">Errores por fila</h3>
        {job.errors.length === 0 ? (
          <p className="text-sm text-muted">{job.errorCount === 0 ? "Sin errores." : "No hay detalle de errores."}</p>
        ) : (
          <>
            <DataTable aria-label="Errores del archivo" columns={errorsCols} rows={job.errors} getRowId={(e) => `${e.row}-${e.code}-${e.message}`} />
            {job.errorsTruncated ? <p className="mt-2 text-xs text-muted">Se muestran los primeros {job.errors.length} de {formatNumber(job.errorCount)} errores.</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

export function ImportJobDrawer({ id, canWrite, onClose }: { id: string; canWrite: boolean; onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const query = useImportJob(id);
  const cancel = useCancelImport();
  const status = query.data?.status;
  const prev = useRef(status);

  // cuando el trabajo termina, refresca el historial
  useEffect(() => {
    if (prev.current && isActiveJob(prev.current) && status && !isActiveJob(status)) void qc.invalidateQueries({ queryKey: ["imports"] });
    prev.current = status;
  }, [status, qc]);

  const onCancel = async () => {
    if (!(await confirm({ title: "Cancelar importación", description: "Las filas ya procesadas se conservan; el resto no se importará.", confirmLabel: "Cancelar importación", cancelLabel: "Seguir", tone: "danger" }))) return;
    try {
      await cancel.mutateAsync(id);
      toast.success("Importación cancelada");
      void query.refetch();
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width={680}
      title="Detalle de la importación"
      description={query.data?.fileName}
      footer={
        canWrite && status && isActiveJob(status) ? (
          <Button variant="danger" leftIcon={<Ban aria-hidden size={14} />} onClick={onCancel} loading={cancel.isPending}>
            Cancelar importación
          </Button>
        ) : undefined
      }
    >
      {query.isPending ? <Skeleton className="h-64 w-full" /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <Body job={query.data} />}
    </Drawer>
  );
}
