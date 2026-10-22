"use client";

import { useState } from "react";
import { Download, Megaphone, UserMinus } from "lucide-react";
import { Badge, Button, IconButton, DataTable, DateTime, EmptyState, PageHeader, SearchInput, Select, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { ActionsHeader, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { Can, useCan } from "@/lib/admin/permissions";

import { NEWSLETTER_STATUS_LABELS, exportNewsletterCsv, useNewsletter, useUnsubscribe, type NewsletterStatus, type NewsletterSubscriber } from "@/lib/admin/api/marketing";

const SHORT_LABELS = { pending: "Pendiente", subscribed: "Suscrito", unsubscribed: "Baja" } as const;
const TONES = { pending: "warning", subscribed: "success", unsubscribed: "neutral" } as const;

export function NewsletterPage() {
  return (
    <PermissionGate perm="marketing:read">
      <NewsletterPageInner />
    </PermissionGate>
  );
}

function NewsletterPageInner() {
  const canWrite = useCan("marketing:write");
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const query = useNewsletter({ status, q, page, pageSize });
  const unsubscribe = useUnsubscribe();


  const doExport = async () => {
    setExporting(true);
    try {
      await exportNewsletterCsv();
      toast.success("Exportación lista (solo suscriptores confirmados)");
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const onUnsubscribe = async (s: NewsletterSubscriber) => {
    const ok = await confirm({ title: "Dar de baja", description: `${s.email} dejará de recibir el newsletter. Para volver a suscribirse tendrá que hacerlo él mismo desde la tienda.`, confirmLabel: "Dar de baja", tone: "danger" });
    if (!ok) return;
    try {
      await unsubscribe.mutateAsync(s.id);
      toast.success(`${s.email} dado de baja`);
    } catch (e) {
      toast.error(apiMessage(e));
    }
  };

  const columns: DataTableColumn<NewsletterSubscriber>[] = [
    { key: "email", header: "Correo", cell: (s) => <span className="font-medium">{s.email}</span> },
    { key: "status", header: "Estado", cell: (s) => <Badge tone={TONES[s.status] ?? "neutral"} dot>{SHORT_LABELS[s.status] ?? s.status}</Badge> },
    { key: "source", header: "Origen", hideOnMobile: true, cell: (s) => s.source },
    { key: "consent", header: "Consentimiento", hideOnMobile: true, cell: (s) => <DateTime value={s.consentAt} /> },
    { key: "created", header: "Alta", hideOnMobile: true, cell: (s) => <DateTime value={s.createdAt} mode="date" /> },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <ActionsHeader />,
            align: "right" as const,
            cell: (s: NewsletterSubscriber) =>
              s.status !== "unsubscribed" ? (
                <IconButton size="sm" variant="danger" label={`Dar de baja a ${s.email}`} icon={<UserMinus aria-hidden size={14} />} onClick={() => onUnsubscribe(s)} loading={unsubscribe.isPending && unsubscribe.variables === s.id} />
              ) : null,
          },
        ]
      : []),
  ];

  const data = query.data;
  const hasFilters = !!(status || q);
  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Suscriptores del boletín. Solo los confirmados reciben correos."
        actions={
          <Can perm="marketing:write">
            <Button leftIcon={<Download aria-hidden size={15} />} loading={exporting} onClick={doExport}>
              Exportar CSV
            </Button>
          </Can>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Buscar por correo…" label="Buscar suscriptores" />
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[{ value: "", label: "Estado: todos" }, ...(Object.keys(NEWSLETTER_STATUS_LABELS) as NewsletterStatus[]).map((k) => ({ value: k, label: NEWSLETTER_STATUS_LABELS[k] }))]}
        />
      </div>
      <DataTable
        aria-label="Suscriptores del newsletter"
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(s) => s.id}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState icon={<Megaphone aria-hidden size={22} />} title={hasFilters ? "Ningún suscriptor coincide" : "Aún no hay suscriptores"} description={hasFilters ? "Prueba con otros filtros." : "Aparecerán cuando alguien se suscriba desde la tienda."} />}
        pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
    </>
  );
}
