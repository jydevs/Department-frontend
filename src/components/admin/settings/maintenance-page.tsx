"use client";

import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Badge, Button, Card, DataTable, ErrorState, NoAccess, PageHeader, Skeleton, useToast } from "@/components/admin/ui";
import { Notice, apiMessage } from "@/components/admin/settings/shared";
import { useCan } from "@/lib/admin/permissions";

import { formatNumber } from "@/lib/admin/format";
import { TASK_LABELS, useRunMaintenance, useSystemInfo, type MaintenanceSummary } from "@/lib/admin/api/settings";

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d ? `${d} d` : null, h ? `${h} h` : null, `${m} min`].filter(Boolean).join(" ");
}

function SystemCard() {
  const query = useSystemInfo();
  return (
    <Card
      title="Estado del sistema"
      description="Datos públicos de la API (/health, /ready y /version)."
      actions={
        <Button size="sm" leftIcon={<RefreshCw aria-hidden size={14} />} onClick={() => query.refetch()} loading={query.isFetching}>
          Actualizar
        </Button>
      }
    >
      {query.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-muted">Servicio</dt>
            <dd>{query.data.health ? <Badge tone="success" dot>En línea</Badge> : <Badge tone="danger" dot>Sin respuesta</Badge>}</dd>
            <dt className="text-muted">Base de datos</dt>
            <dd>{query.data.ready ? <Badge tone="success" dot>Lista ({query.data.ready.database})</Badge> : <Badge tone="danger" dot>No disponible</Badge>}</dd>
            <dt className="text-muted">Tiempo activo</dt>
            <dd>{query.data.health ? formatUptime(query.data.health.uptimeSeconds) : "—"}</dd>
            <dt className="text-muted">Versión</dt>
            <dd>{query.data.version ? `${query.data.version.name} ${query.data.version.version}` : "—"}</dd>
            <dt className="text-muted">Commit</dt>
            <dd className="font-mono text-xs">{query.data.version?.gitSha ?? "—"}</dd>
            <dt className="text-muted">Node.js</dt>
            <dd>{query.data.version?.node ?? "—"}</dd>
          </dl>
          {query.data.problems.length ? (
            <Notice tone="warning" title="Algunas comprobaciones fallaron">
              <ul className="list-disc pl-5">
                {query.data.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function MaintenanceCard() {
  const toast = useToast();
  const run = useRunMaintenance();
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setError(null);
    try {
      const res = await run.mutateAsync();
      setSummary(res);
      if (res.executed) toast.success("Mantenimiento ejecutado");
      else toast.warning("Otra instancia ya está ejecutando el mantenimiento");
    } catch (e) {
      setError(apiMessage(e));
      toast.error(apiMessage(e));
    }
  };

  const total = summary?.tasks.reduce((s, t) => s + t.affected, 0) ?? 0;
  return (
    <Card
      title="Mantenimiento"
      description="Limpieza de sesiones, correos, versiones e importaciones antiguas. Se ejecuta solo cada hora; aquí puedes lanzarlo ahora (máx. 2 por minuto)."
      actions={
        <Button variant="primary" leftIcon={<Play aria-hidden size={14} />} onClick={execute} loading={run.isPending}>
          Ejecutar mantenimiento
        </Button>
      }
    >
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {summary ? (
        <div className="space-y-3">
          {!summary.executed ? <Notice tone="warning">No se ejecutó nada: otro proceso ya tiene el bloqueo de mantenimiento. Inténtalo de nuevo en unos instantes.</Notice> : <p className="text-sm text-muted">{formatNumber(total)} registro(s) afectado(s) en total.</p>}
          {summary.tasks.length ? (
            <DataTable
              aria-label="Resumen del mantenimiento"
              columns={[
                { key: "task", header: "Tarea", cell: (t) => <span>{TASK_LABELS[t.task] ?? t.task} <code className="ml-1 font-mono text-xs text-muted">{t.task}</code></span> },
                { key: "affected", header: "Afectados", align: "right", cell: (t) => formatNumber(t.affected) },
                { key: "state", header: "Resultado", cell: (t) => (t.error ? <Badge tone="danger" dot>Error</Badge> : <Badge tone="success" dot>Correcto</Badge>) },
                { key: "error", header: "Detalle", hideOnMobile: true, cell: (t) => (t.error ? <span className="text-danger">{t.error}</span> : <span className="text-muted">—</span>) },
              ]}
              rows={summary.tasks}
              getRowId={(t) => t.task}
            />
          ) : null}
        </div>
      ) : !error ? (
        <p className="text-sm text-muted">Aún no se ha ejecutado desde esta pantalla.</p>
      ) : null}
    </Card>
  );
}

export function MaintenancePage() {
  const canWrite = useCan("settings:write");
  if (!canWrite) return <NoAccess permission="settings:write" />;
  return (
    <>
      <PageHeader title="Mantenimiento" description="Estado de la API y tareas de limpieza." />
      <div className="space-y-5">
        <SystemCard />
        <MaintenanceCard />
      </div>
    </>
  );
}
