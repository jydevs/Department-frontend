"use client";
import { Wrench } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import { Card, DateTime, EmptyState, PageHeader } from "@/components/admin/ui/Display";
import { useMaintenanceRuns, useRunMaintenance } from "@/lib/admin/api/admin";
import { useCan } from "@/lib/admin/permissions";

export default function MaintenancePage() {
  const { data } = useMaintenanceRuns();
  const run = useRunMaintenance();
  const can = useCan("settings:write");
  return (
    <>
      <PageHeader title="Mantenimiento" description="Limpieza de sesiones expiradas, tokens de vista previa y carritos abandonados." actions={can ? <Button variant="primary" icon={<Wrench className="size-4" />} loading={run.isPending} onClick={() => run.mutate(undefined)}>Ejecutar mantenimiento</Button> : undefined} />
      <Card title="Historial de ejecuciones">{!data?.length ? <EmptyState title="Aún no se ha ejecutado" text="Los resúmenes aparecerán aquí." /> : <ul className="space-y-3">{data.map((r) => <li key={r.ranAt} className="rounded-sm bg-surface2 p-3 text-sm"><p className="text-xs text-muted"><DateTime value={r.ranAt} /></p><p>{r.summary}</p></li>)}</ul>}</Card>
    </>
  );
}
