"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { Download, Users } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, PageHeader, SearchInput, Select, useToast, type DataTableColumn } from "@/components/admin/ui";
import { apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { Can } from "@/lib/admin/permissions";

import { formatDate } from "@/lib/admin/format";
import { exportCustomersCsv, useCustomers, type Customer, type CustomerFilters } from "@/lib/admin/api/customers";

export function MarketingBadge({ customer }: { customer: Pick<Customer, "acceptsMarketing" | "emailVerified"> }) {
  if (customer.acceptsMarketing && customer.emailVerified) return <Badge tone="success">Acepta marketing</Badge>;
  if (customer.acceptsMarketing) return <Badge tone="warning">Sin verificar</Badge>;
  return <Badge tone="neutral">No acepta</Badge>;
}

export function CustomersPage() {
  return (
    <PermissionGate perm="customers:read">
      <CustomersPageInner />
    </PermissionGate>
  );
}

function CustomersPageInner() {
  const router = useRouter();
  const toast = useToast();
  const [filters, setFilters] = useState<CustomerFilters>({ q: "", acceptsMarketing: "", isActive: "", tag: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const query = useCustomers(filters, page, pageSize);


  const patch = (next: Partial<CustomerFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
  };
  const hasFilters = !!(filters.q || filters.acceptsMarketing || filters.isActive || filters.tag);

  const doExport = async () => {
    setExporting(true);
    try {
      await exportCustomersCsv(filters);
      toast.success("Exportación lista: clientes.csv");
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "name",
      header: "Cliente",
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.anonymizedAt ? "Cliente anonimizado" : `${c.firstName} ${c.lastName}`.trim() || "—"}</p>
          <p className="truncate text-xs text-muted">{c.email}</p>
        </div>
      ),
    },
    { key: "marketing", header: "Marketing", cell: (c) => <MarketingBadge customer={c} /> },
    {
      key: "tags",
      header: "Etiquetas",
      hideOnMobile: true,
      cell: (c) =>
        c.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {c.tags.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {c.tags.length > 3 ? <Badge>+{c.tags.length - 3}</Badge> : null}
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "state",
      header: "Estado",
      cell: (c) => (c.anonymizedAt ? <Badge tone="neutral">Anonimizado</Badge> : c.isActive ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="danger" dot>Desactivado</Badge>),
    },
    { key: "account", header: "Cuenta", hideOnMobile: true, cell: (c) => (c.hasAccount ? "Registrado" : "Invitado") },
    { key: "created", header: "Alta", hideOnMobile: true, cell: (c) => formatDate(c.createdAt) },
  ];

  const data = query.data;
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Personas que han comprado o creado una cuenta en la tienda."
        actions={
          <Can perm="customers:write">
            <Button leftIcon={<Download aria-hidden size={15} />} loading={exporting} onClick={doExport}>
              Exportar CSV
            </Button>
          </Can>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <SearchInput value={filters.q ?? ""} onChange={(q) => patch({ q })} placeholder="Buscar por nombre o correo…" label="Buscar clientes" />
        <Select
          aria-label="Filtrar por marketing"
          value={filters.acceptsMarketing ?? ""}
          onChange={(e) => patch({ acceptsMarketing: e.target.value as CustomerFilters["acceptsMarketing"] })}
          options={[
            { value: "", label: "Marketing: todos" },
            { value: "true", label: "Aceptan marketing" },
            { value: "false", label: "No aceptan" },
          ]}
        />
        <Select
          aria-label="Filtrar por estado"
          value={filters.isActive ?? ""}
          onChange={(e) => patch({ isActive: e.target.value as CustomerFilters["isActive"] })}
          options={[
            { value: "", label: "Estado: todos" },
            { value: "true", label: "Activos" },
            { value: "false", label: "Desactivados" },
          ]}
        />
        <SearchInput value={filters.tag ?? ""} onChange={(tag) => patch({ tag })} placeholder="Etiqueta exacta…" label="Filtrar por etiqueta" />
      </div>
      <DataTable
        aria-label="Lista de clientes"
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(c) => c.id}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={
          <EmptyState
            icon={<Users aria-hidden size={22} />}
            title={hasFilters ? "Ningún cliente coincide" : "Aún no hay clientes"}
            description={hasFilters ? "Prueba con otros filtros o límpialos." : "Los clientes aparecerán aquí cuando compren o se registren."}
            action={hasFilters ? <Button onClick={() => patch({ q: "", acceptsMarketing: "", isActive: "", tag: "" })}>Limpiar filtros</Button> : undefined}
          />
        }
        pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
    </>
  );
}
