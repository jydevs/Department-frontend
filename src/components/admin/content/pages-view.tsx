"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { Button, Card, DataTable, DateTime, EmptyState, NoAccess, PageHeader, SearchInput, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { RedirectDialog } from "@/components/admin/redirects/redirects-view";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { STOREFRONT_URL, safeHref } from "@/lib/admin/utils";
import { useDeletePage, useDocuments, type DocListItem } from "@/lib/admin/api/content";
import { DocStatusBadges } from "./doc-status";

/** Elimina una página (borrado lógico) y ofrece crear la redirección sugerida. Devuelve `run(handle)`. */
export function usePageDeletion(onDeleted?: () => void, onFinished?: () => void) {
  const confirm = useConfirm();
  const toast = useToast();
  const del = useDeletePage();
  const [redirect, setRedirect] = useState<{ fromPath: string; toPath: string } | null>(null);

  const run = async (handle: string, title?: string | null) => {
    const ok = await confirm({
      title: `¿Eliminar la página «${title || handle}»?`,
      description: "La página dejará de estar disponible en la tienda. Después podrás crear una redirección para no perder visitas.",
      confirmLabel: "Eliminar página",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await del.mutateAsync(handle);
      toast.success("Página eliminada");
      setRedirect(res.suggestedRedirect);
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 403 ? "No puedes eliminar páginas: requiere el permiso content:publish." : errorMessage(e));
    }
  };

  const dialog = <RedirectDialog open={redirect !== null} onClose={() => { setRedirect(null); onFinished?.(); }} initial={redirect ? { fromPath: redirect.fromPath, toPath: redirect.toPath } : undefined} />;
  return { run, dialog, busy: del.isPending };
}

export function PagesView() {
  const canRead = useCan("content:read");
  const canWrite = useCan("content:write");
  // borrar una página la quita de la tienda: exige publicar
  const canPublish = useCan("content:publish");
  const router = useRouter();
  const docs = useDocuments("page");
  const [q, setQ] = useState("");
  const deletion = usePageDeletion();

  if (!canRead) return <NoAccess permission="content:read" />;
  const needle = q.trim().toLowerCase();
  const rows = (docs.data ?? []).filter((d) => !needle || d.key.includes(needle) || (d.title ?? "").toLowerCase().includes(needle));

  const columns: DataTableColumn<DocListItem>[] = [
    {
      key: "title",
      header: "Página",
      cell: (d) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{d.title || d.key}</p>
          <p className="truncate font-mono text-xs text-muted">/pages/{d.key}</p>
        </div>
      ),
    },
    { key: "status", header: "Estado", cell: (d) => <DocStatusBadges item={d} /> },
    { key: "updated", header: "Editada", width: "150px", hideOnMobile: true, cell: (d) => <DateTime value={d.draftUpdatedAt} mode="relative" /> },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "230px",
      cell: (d) => {
        const href = d.publishedAt ? safeHref(`${STOREFRONT_URL}/pages/${d.key}`) : null;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-muted hover:bg-surface-2 hover:text-text" aria-label={`Ver ${d.title || d.key} en la tienda`}>
                Ver <ExternalLink aria-hidden size={12} />
              </a>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => router.push(`/content/pages/${encodeURIComponent(d.key)}`)}>
              Editar
            </Button>
            {canPublish ? (
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => void deletion.run(d.key, d.title)}>
                Eliminar
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Páginas"
        description="Páginas informativas de la tienda (Sobre nosotros, Contacto, Comunidad…), construidas con secciones."
        breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Páginas" }]}
        actions={
          canWrite ? (
            <Button variant="primary" leftIcon={<Plus aria-hidden size={16} />} onClick={() => router.push("/content/pages/new")}>
              Nueva página
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por título o handle…" className="max-w-sm" />
      </div>
      <Card flush>
        <DataTable<DocListItem>
          aria-label="Páginas"
          columns={columns}
          rows={rows}
          getRowId={(d) => d.id}
          loading={docs.isPending}
          error={docs.error ?? undefined}
          onRetry={() => void docs.refetch()}
          onRowClick={(d) => router.push(`/content/pages/${encodeURIComponent(d.key)}`)}
          empty={
            <EmptyState
              icon={<FileText aria-hidden size={22} />}
              title={q ? "Sin resultados" : "Aún no hay páginas"}
              description={q ? "Prueba con otro término." : "Crea tu primera página con secciones."}
              action={
                canWrite && !q ? (
                  <Button variant="primary" onClick={() => router.push("/content/pages/new")}>
                    Nueva página
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>
      {deletion.dialog}
    </>
  );
}
