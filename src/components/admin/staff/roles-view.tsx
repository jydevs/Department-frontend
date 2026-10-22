"use client";

import { Badge, Card, ErrorState, Skeleton } from "@/components/admin/ui";
import { ACTION_LABELS, groupPermissions } from "@/components/admin/settings/shared";
import type { Role } from "@/lib/admin/api/staff";
import type { ApiError } from "@/lib/admin/errors";
import { roleLabel } from "./staff-dialogs";

export function RolesView({ roles, loading, error, onRetry }: { roles: Role[] | undefined; loading: boolean; error: ApiError | null; onRetry: () => void }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      {(roles ?? []).map((r) => {
        const groups = groupPermissions(r.permissions);
        return (
          <Card
            key={r.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {roleLabel(r)}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">{r.key}</code>
                {r.isSystem ? <Badge tone="info">Sistema</Badge> : null}
              </span>
            }
            description={`${r.permissions.length} permiso(s) · solo lectura`}
          >
            {groups.length === 0 ? (
              <p className="text-sm text-muted">Sin permisos.</p>
            ) : (
              <dl className="space-y-2">
                {groups.map((g) => (
                  <div key={g.resource} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <dt className="w-40 shrink-0 text-sm font-medium">{g.label}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {g.actions.map((a) => (
                        <Badge key={a} tone={a === "write" || a === "publish" || a === "payments" || a === "refunds" ? "warning" : "neutral"}>
                          {ACTION_LABELS[a] ?? a}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        );
      })}
    </div>
  );
}
