"use client";

import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { Badge, Button, Card, CopyButton, DateTime, Drawer, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton } from "@/components/admin/ui";
import { plainValue, PermissionGate } from "@/components/admin/settings/shared";
import { useCan } from "@/lib/admin/permissions";
import { useAuditLogs, diffRows, type AuditLog } from "@/lib/admin/api/audit";
import { useStaff } from "@/lib/admin/api/staff";

const ENTITY_TYPES = [
  "Collection",
  "ContentDocument",
  "Customer",
  "Discount",
  "ImportJob",
  "InventoryLevel",
  "Location",
  "Maintenance",
  "Media",
  "Metafield",
  "Order",
  "Product",
  "Redirect",
  "RefreshToken",
  "ShippingRate",
  "ShippingZone",
  "StaffUser",
  "TaxSetting",
  "Variant",
  "contact_message",
  "email_template",
  "newsletter_subscriber",
];

function DiffTable({ diff }: { diff: unknown }) {
  const rows = diffRows(diff);
  if (rows.length === 0) return <p className="text-sm text-muted">Esta acción no registró cambios de campos.</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm" aria-label="Cambios registrados">
        <thead>
          <tr className="border-b border-border bg-surface-2/60 text-left text-xs tracking-wide text-muted uppercase">
            <th scope="col" className="px-3 py-2">Campo</th>
            <th scope="col" className="px-3 py-2">Antes</th>
            <th scope="col" className="px-3 py-2">Después</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className="border-b border-border align-top last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-mono text-xs font-medium">{r.field}</th>
              <td className="max-w-[220px] px-3 py-2 font-mono text-xs break-words text-muted">{r.single ? "—" : plainValue(r.before)}</td>
              <td className="max-w-[260px] px-3 py-2 font-mono text-xs break-words">
                {r.single ? null : <span aria-hidden className="mr-1 text-muted">→</span>}
                {r.single && r.after === true ? <span className="text-muted">campo modificado</span> : plainValue(r.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogDrawer({ log, actorName, onClose }: { log: AuditLog; actorName: string | null; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} width={620} title={log.action} description={`${log.entityType}${log.entityId ? ` · ${log.entityId}` : ""}`}>
      <div className="space-y-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Fecha</dt>
          <dd><DateTime value={log.createdAt} /></dd>
          <dt className="text-muted">Actor</dt>
          <dd>{actorName ?? (log.actorType === "system" ? "Sistema" : log.actorId ?? log.actorType)} <Badge>{log.actorType}</Badge></dd>
          <dt className="text-muted">IP</dt>
          <dd>{log.ip ?? "—"}</dd>
          <dt className="text-muted">ID de petición</dt>
          <dd className="flex flex-wrap items-center gap-2">
            {log.requestId && log.requestId !== "unknown" ? (
              <>
                <code className="font-mono text-xs break-all">{log.requestId}</code>
                <CopyButton value={log.requestId} label="Copiar" />
              </>
            ) : (
              "—"
            )}
          </dd>
        </dl>
        <div>
          <h3 className="mb-2 text-sm font-medium">Cambios</h3>
          <DiffTable diff={log.diff} />
        </div>
      </div>
    </Drawer>
  );
}

export function AuditPage() {
  return (
    <PermissionGate perm="audit:read">
      <AuditPageInner />
    </PermissionGate>
  );
}

function AuditPageInner() {
  const canStaff = useCan("staff:read");
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useAuditLogs({ entityType, actorId });
  const staff = useStaffForFilter(canStaff);

  const names = useMemo(() => new Map((staff ?? []).map((s) => [s.id, s.fullName])), [staff]);


  const logs = query.data?.pages.flatMap((p) => p.items) ?? [];
  const open = logs.find((l) => l.id === openId) ?? null;
  const hasFilters = !!(entityType || actorId);

  return (
    <>
      <PageHeader title="Auditoría" description="Registro de las acciones del equipo y del sistema, de la más reciente a la más antigua." />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <Input aria-label="Filtrar por tipo de entidad" list="audit-entity-types" placeholder="Tipo de entidad (p. ej. Product)" value={entityType} onChange={(e) => setEntityType(e.target.value)} maxLength={60} />
          <datalist id="audit-entity-types">
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        {canStaff && staff ? (
          <Select aria-label="Filtrar por actor" value={actorId} onChange={(e) => setActorId(e.target.value)} options={[{ value: "", label: "Actor: todos" }, ...staff.map((s) => ({ value: s.id, label: s.fullName }))]} />
        ) : (
          <Input aria-label="Filtrar por ID de actor" placeholder="ID del actor (UUID)" value={actorId} onChange={(e) => setActorId(e.target.value.trim())} />
        )}
        {hasFilters ? <Button onClick={() => { setEntityType(""); setActorId(""); }}>Limpiar filtros</Button> : null}
      </div>
      {query.isPending ? (
        <div className="space-y-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={<ScrollText aria-hidden size={22} />} title="Sin registros" description={hasFilters ? "Ningún registro coincide con los filtros." : "Todavía no hay actividad registrada."} />
        </div>
      ) : (
        <Card flush>
          <ul className="divide-y divide-border" aria-label="Registros de auditoría">
            {logs.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setOpenId(l.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left hover:bg-surface-2 focus-visible:bg-surface-2">
                  <span className="w-52 shrink-0 text-[13px] whitespace-nowrap text-muted"><DateTime value={l.createdAt} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[13px] font-medium">{l.action}</span>
                    <span className="block truncate text-xs text-muted">
                      {l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px]">{(l.actorId && names.get(l.actorId)) || (l.actorType === "system" ? "Sistema" : l.actorType)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px] text-muted">
            <span>{logs.length} registro(s) cargados</span>
            {query.hasNextPage ? (
              <Button size="sm" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                Cargar más
              </Button>
            ) : (
              <span>No hay más registros</span>
            )}
          </div>
        </Card>
      )}
      {open ? <LogDrawer log={open} actorName={(open.actorId && names.get(open.actorId)) || null} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

function useStaffForFilter(enabled: boolean) {
  const q = useStaff(1, 100, enabled);
  return enabled ? q.data?.items : undefined;
}
