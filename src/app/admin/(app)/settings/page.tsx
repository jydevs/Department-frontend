"use client";
import { Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, DateTime, EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { useAuditLog, useRunMaintenance, type MaintenanceResult } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";

const TASKS: Record<string, string> = {};
const taskName = (t: string) => TASKS[t] ?? t.replace(/[_-]/g, " ");
const FILTER = { actorId: "", entity: "Maintenance" };

export default function MaintenancePage() {
  const can = useCan("settings:write"), canAudit = useCan("audit:read");
  const run = useRunMaintenance();
  const [last, setLast] = useState<{ at: string; r: MaintenanceResult } | null>(null);
  const hist = useAuditLog(FILTER, canAudit);
  const runs = hist.data?.pages.flatMap((p) => p.items).filter((a) => a.action === "maintenance:run") ?? [];
  return (
    <>
      <PageHeader title="Mantenimiento" description="Limpieza de sesiones expiradas, tokens y datos caducados. También corre solo cada hora." actions={can ? <Button variant="primary" icon={<Wrench className="size-4" />} loading={run.isPending} onClick={() => run.mutate(undefined, { onSuccess: (r) => setLast({ at: new Date().toISOString(), r }) })}>Ejecutar mantenimiento</Button> : undefined} />
      <div className="space-y-4">
        {run.error && <p role="alert" className="text-sm text-accent-text">{errorMessage(run.error)}</p>}
        {last && <Card title="Resultado de la última ejecución"><p className="mb-2 text-xs text-muted"><DateTime value={last.at} /></p>
          {!last.r.executed ? <p className="text-sm">No se ejecutó: ya hay otra pasada de mantenimiento en curso. Inténtalo en un momento.</p> : <ul className="space-y-1 text-sm">{last.r.tasks.map((t) => <li key={t.task} className="flex items-center justify-between gap-2 rounded-sm bg-surface2 p-2"><span className="capitalize">{taskName(t.task)}</span>{t.error ? <Badge tone="danger">Error: {t.error}</Badge> : <span>{t.affected} registro{t.affected === 1 ? "" : "s"}</span>}</li>)}</ul>}</Card>}
        <Card title="Historial de ejecuciones">{!canAudit ? <p className="text-sm text-muted">Necesitas el permiso de auditoría para ver el historial.</p> : hist.isLoading ? <Skeleton className="h-16" /> : !runs.length ? <EmptyState title="Aún no se ha ejecutado desde el panel" text="Aquí aparecen las ejecuciones manuales registradas en la auditoría." /> : <ul className="space-y-2">{runs.map((r) => <li key={r.id} className="rounded-sm bg-surface2 p-3 text-sm"><DateTime value={r.at} /> <span className="text-muted">· ejecución manual</span></li>)}</ul>}</Card>
      </div>
    </>
  );
}
