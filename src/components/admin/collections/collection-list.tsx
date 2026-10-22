"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { ExternalLink, Pencil, Plus, Shapes, Trash2 } from "lucide-react";
import { Badge, DataTable, EmptyState, LinkButton, Menu, NoAccess, PageHeader, useConfirm, useToast, type DataTableColumn } from "@/components/admin/ui";
import { SORT_LABELS, collectionsApi, useCollectionList, useInvalidateCollections, type Collection } from "@/lib/admin/api/collections";
import { errorMessage } from "@/lib/admin/errors";
import { formatDate } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { STOREFRONT_URL } from "@/lib/admin/utils";

export function CollectionList() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const canRead = useCan("collections:read");
  const canWrite = useCan("collections:write");
  const invalidate = useInvalidateCollections();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const list = useCollectionList({ page, pageSize }, canRead);

  if (!canRead) return <NoAccess permission="collections:read" />;

  const remove = async (c: Collection) => {
    const ok = await confirm({ title: `¿Eliminar «${c.title}»?`, description: "Dejará de mostrarse en la tienda. Los productos no se eliminan.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await collectionsApi.remove(c.id);
      toast.success("Colección eliminada.");
      await invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const columns: DataTableColumn<Collection>[] = [
    {
      key: "title",
      header: "Colección",
      cell: (c) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{c.title}</span>
          <span className="block truncate text-xs text-muted">/{c.handle}</span>
        </span>
      ),
    },
    { key: "type", header: "Tipo", cell: (c) => <Badge tone={c.type === "smart" ? "info" : "neutral"}>{c.type === "smart" ? "Inteligente" : "Manual"}</Badge> },
    {
      key: "published",
      header: "Visibilidad",
      cell: (c) => (
        <Badge tone={c.isPublished ? "success" : "neutral"} dot>
          {c.isPublished ? "Publicada" : "Oculta"}
        </Badge>
      ),
    },
    { key: "sort", header: "Orden", hideOnMobile: true, cell: (c) => SORT_LABELS[c.sortOrder] },
    { key: "created", header: "Creada", hideOnMobile: true, cell: (c) => formatDate(c.createdAt) },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "56px",
      cell: (c) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`Acciones de ${c.title}`}
            items={[
              { label: canWrite ? "Editar" : "Ver", icon: <Pencil aria-hidden size={14} />, onSelect: () => router.push(`/collections/${c.id}`) },
              ...(c.isPublished ? [{ label: "Ver en la tienda", icon: <ExternalLink aria-hidden size={14} />, onSelect: () => window.open(`${STOREFRONT_URL}/collections/${c.handle}`, "_blank", "noopener,noreferrer") }] : []),
              ...(canWrite ? [{ label: "Eliminar", icon: <Trash2 aria-hidden size={14} />, danger: true, onSelect: () => void remove(c) }] : []),
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Colecciones"
        description="Agrupa productos a mano o con reglas automáticas."
        actions={
          canWrite ? (
            <LinkButton href="/collections/new" variant="primary" leftIcon={<Plus aria-hidden size={16} />}>
              Nueva colección
            </LinkButton>
          ) : null
        }
      />
      <DataTable
        aria-label="Lista de colecciones"
        columns={columns}
        rows={list.data?.items ?? []}
        getRowId={(c) => c.id}
        loading={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(c) => router.push(`/collections/${c.id}`)}
        empty={
          <EmptyState
            icon={<Shapes aria-hidden size={22} />}
            title="Aún no hay colecciones"
            description="Crea una colección manual o una inteligente basada en reglas."
            action={
              canWrite ? (
                <LinkButton href="/collections/new" variant="primary">
                  Nueva colección
                </LinkButton>
              ) : undefined
            }
          />
        }
        pagination={list.data ? { page, pageSize, total: list.data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
    </>
  );
}
