"use client";

import { useRouter } from "@/lib/admin/navigation";
import { Lock, Mail } from "lucide-react";
import { Badge, DataTable, DateTime, EmptyState, PageHeader } from "@/components/admin/ui";
import { PermissionGate } from "@/components/admin/settings/shared";
import { SENSITIVE_TEMPLATES, TEMPLATE_LABELS, useEmailTemplates, type EmailTemplate } from "@/lib/admin/api/emails";

export function TemplatesList() {
  return (
    <PermissionGate perm="marketing:read">
      <TemplatesListInner />
    </PermissionGate>
  );
}

function TemplatesListInner() {
  const router = useRouter();
  const query = useEmailTemplates();
  return (
    <>
      <PageHeader title="Plantillas de correo" description="Correos transaccionales que envía la tienda. Edita el asunto y el contenido con variables." />
      <DataTable<EmailTemplate>
        aria-label="Plantillas de correo"
        columns={[
          {
            key: "name",
            header: "Plantilla",
            cell: (t) => (
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {TEMPLATE_LABELS[t.key]?.name ?? t.key}
                  {SENSITIVE_TEMPLATES.includes(t.key) ? <Lock aria-label="Solo propietario o administrador" size={13} className="text-muted" /> : null}
                </p>
                <p className="truncate text-xs text-muted">{TEMPLATE_LABELS[t.key]?.description ?? t.key}</p>
              </div>
            ),
          },
          { key: "subject", header: "Asunto", hideOnMobile: true, cell: (t) => <span className="line-clamp-1 max-w-sm">{t.subject}</span> },
          { key: "active", header: "Estado", cell: (t) => (t.isActive ? <Badge tone="success" dot>Activa</Badge> : <Badge dot>Desactivada</Badge>) },
          { key: "updated", header: "Actualizada", hideOnMobile: true, cell: (t) => <DateTime value={t.updatedAt} mode="relative" /> },
        ]}
        rows={query.data ?? []}
        getRowId={(t) => t.key}
        onRowClick={(t) => router.push(`/emails/${t.key}`)}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState icon={<Mail aria-hidden size={22} />} title="No hay plantillas" description="Las plantillas por defecto se crean al iniciar el servidor." />}
      />
    </>
  );
}
