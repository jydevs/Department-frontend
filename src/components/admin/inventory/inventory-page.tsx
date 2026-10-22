"use client";

import { useState } from "react";
import { History, PackageSearch, Plus } from "lucide-react";
import { Badge, Button, Checkbox, DataTable, EmptyState, ErrorState, Input, NoAccess, PageHeader, SearchInput, Select, Tabs, type DataTableColumn } from "@/components/admin/ui";
import { useAdjustmentHistory, useInventoryLevels, useLocations, reasonLabel, type InventoryAdjustment, type InventoryLevel } from "@/lib/admin/api/inventory";
import { formatDateTime, formatNumber } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { AdjustDialog, type AdjustTarget } from "./adjust-dialog";
import { LocationsPanel } from "./locations-panel";
import { VariantPicker } from "./variant-picker";

type TabKey = "levels" | "history" | "locations";

export function InventoryPage() {
  const canRead = useCan("inventory:read");
  const [tab, setTab] = useState<TabKey>("levels");
  if (!canRead) return <NoAccess permission="inventory:read" />;
  return (
    <>
      <PageHeader title="Inventario" description="Stock por variante y ubicación, historial de ajustes y ubicaciones." />
      <Tabs
        aria-label="Secciones de inventario"
        className="mb-5"
        value={tab}
        onChange={(k) => setTab(k === "history" ? "history" : k === "locations" ? "locations" : "levels")}
        tabs={[
          { key: "levels", label: "Niveles" },
          { key: "history", label: "Historial" },
          { key: "locations", label: "Ubicaciones" },
        ]}
      />
      {tab === "levels" ? <LevelsTab /> : tab === "history" ? <HistoryTab /> : <LocationsPanel />}
    </>
  );
}

/* ------------------------------ niveles ------------------------------ */

function LevelsTab() {
  const canWrite = useCan("inventory:write");
  const canPickProducts = useCan("products:read");
  const locations = useLocations();
  const [q, setQ] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [threshold, setThreshold] = useState("5");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [target, setTarget] = useState<{ t: AdjustTarget; locationId?: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const th = Number.isInteger(Number(threshold)) && Number(threshold) >= 0 ? Number(threshold) : 5;
  const list = useInventoryLevels({ page, pageSize, q: q || undefined, locationId: locationId || undefined, lowStock: lowStock || undefined, lowStockThreshold: lowStock ? th : undefined });
  const rows = list.data?.items ?? [];

  const columns: DataTableColumn<InventoryLevel>[] = [
    {
      key: "variant",
      header: "Producto",
      cell: (l) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{l.productTitle ?? l.variantTitle}</span>
          <span className="block truncate text-xs text-muted">
            {l.productTitle && l.variantTitle !== "Default Title" ? `${l.variantTitle} · ` : ""}
            {l.variantSku ?? "Sin SKU"}
          </span>
        </span>
      ),
    },
    { key: "location", header: "Ubicación", cell: (l) => l.locationName },
    { key: "onHand", header: "En mano", align: "right", cell: (l) => <span className="tabular-nums">{formatNumber(l.onHand)}</span> },
    { key: "reserved", header: "Reservado", align: "right", hideOnMobile: true, cell: (l) => <span className="tabular-nums">{formatNumber(l.reserved)}</span> },
    {
      key: "available",
      header: "Disponible",
      align: "right",
      cell: (l) => {
        const a = l.onHand - l.reserved;
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="tabular-nums">{formatNumber(a)}</span>
            {a <= 0 ? <Badge tone="danger">Agotado</Badge> : l.lowStock ? <Badge tone="warning">Bajo</Badge> : null}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "110px",
      cell: (l) =>
        canWrite ? (
          <Button size="sm" aria-label={`Ajustar ${l.variantTitle} en ${l.locationName}`} onClick={(e) => { e.stopPropagation(); setTarget({ t: { variantId: l.variantId, variantTitle: l.variantTitle, variantSku: l.variantSku, productTitle: l.productTitle ?? undefined }, locationId: l.locationId }); }}>
            Ajustar
          </Button>
        ) : null,
    },
  ];

  const filtered = !!(q || locationId || lowStock);

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto_auto_auto] lg:items-end">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Buscar por SKU o variante…" label="Buscar en inventario" />
        <Select aria-label="Ubicación" value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">Todas las ubicaciones</option>
          {(locations.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.isActive ? "" : " (inactiva)"}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-3">
          <Checkbox label="Solo bajo stock" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
          {lowStock ? (
            <Input aria-label="Umbral de bajo stock (disponible menor o igual a)" type="number" min={0} value={threshold} wrapperClassName="w-20" onChange={(e) => { setThreshold(e.target.value); setPage(1); }} />
          ) : null}
        </div>
        {canWrite && canPickProducts ? (
          <Button leftIcon={<Plus aria-hidden size={15} />} onClick={() => setPicking(true)} className="lg:justify-self-end">
            Ajustar otra variante
          </Button>
        ) : null}
      </div>
      {lowStock ? <p className="mb-3 text-xs text-muted">Mostrando filas con disponible (en mano − reservado) menor o igual a {th}.</p> : null}
      <DataTable
        aria-label="Niveles de inventario"
        columns={columns}
        rows={rows}
        getRowId={(l) => l.id}
        loading={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={canWrite ? (l) => setTarget({ t: { variantId: l.variantId, variantTitle: l.variantTitle, variantSku: l.variantSku, productTitle: l.productTitle ?? undefined }, locationId: l.locationId }) : undefined}
        empty={<EmptyState icon={<PackageSearch aria-hidden size={22} />} title={filtered ? "Sin resultados" : "Aún no hay stock registrado"} description={filtered ? "Prueba con otros filtros." : "Usa «Ajustar otra variante» para registrar las primeras cantidades."} />}
        pagination={list.data ? { page, pageSize, total: list.data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
      <AdjustDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        target={target?.t ?? null}
        initialLocationId={target?.locationId}
        locations={locations.data ?? []}
        levels={rows.filter((l) => l.variantId === target?.t.variantId)}
      />
      <VariantPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(t) => {
          setPicking(false);
          setTarget({ t });
        }}
      />
    </>
  );
}

/* ------------------------------ historial ------------------------------ */

function HistoryTab() {
  const locations = useLocations();
  const hist = useAdjustmentHistory();
  const names = new Map((locations.data ?? []).map((l) => [l.id, l.name]));
  const rows: InventoryAdjustment[] = hist.data?.pages.flatMap((p) => p.items) ?? [];

  const columns: DataTableColumn<InventoryAdjustment>[] = [
    { key: "date", header: "Fecha", cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span> },
    {
      key: "variant",
      header: "Producto",
      cell: (a) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{a.productTitle ?? a.variantTitle ?? a.variantId.slice(0, 8)}</span>
          {a.productTitle && a.variantTitle && a.variantTitle !== "Default Title" ? <span className="block truncate text-xs text-muted">{a.variantTitle}</span> : null}
        </span>
      ),
    },
    { key: "location", header: "Ubicación", hideOnMobile: true, cell: (a) => names.get(a.locationId) ?? "—" },
    {
      key: "delta",
      header: "Cambio",
      align: "right",
      cell: (a) => <span className={a.delta > 0 ? "text-success tabular-nums" : "text-danger tabular-nums"}>{a.delta > 0 ? `+${formatNumber(a.delta)}` : formatNumber(a.delta)}</span>,
    },
    { key: "reason", header: "Motivo", cell: (a) => reasonLabel(a.reason) },
    { key: "note", header: "Nota", hideOnMobile: true, cell: (a) => <span className="text-muted">{a.note ?? "—"}</span> },
  ];

  if (hist.error && rows.length === 0) return <ErrorState error={hist.error} onRetry={() => hist.refetch()} />;
  return (
    <div className="flex flex-col gap-3">
      <DataTable
        aria-label="Historial de ajustes"
        columns={columns}
        rows={rows}
        getRowId={(a) => a.id}
        loading={hist.isFetching && rows.length === 0}
        empty={<EmptyState icon={<History aria-hidden size={22} />} title="Sin ajustes todavía" description="Los ajustes de stock aparecerán aquí, del más reciente al más antiguo." />}
      />
      {hist.hasNextPage ? (
        <Button className="self-center" loading={hist.isFetchingNextPage} onClick={() => void hist.fetchNextPage()}>
          Cargar más
        </Button>
      ) : null}
    </div>
  );
}
