"use client";

import { useState } from "react";
import { Link } from "@/lib/admin/navigation";
import { Eye, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DateTime,
  Dialog,
  EmptyState,
  IconButton,
  Money,
  PageHeader,
  SearchInput,
  Select,
  useConfirm,
  useToast,
  type BadgeTone,
  type DataTableColumn,
} from "@/components/admin/ui";
import { ActionsHeader, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { Can, useCan } from "@/lib/admin/permissions";
import { ApiError } from "@/lib/admin/errors";
import { formatNumber } from "@/lib/admin/format";
import { DISCOUNT_TYPE_LABELS, useDeleteDiscount, useDiscounts, useRedemptions, useUpdateDiscount, type Discount } from "@/lib/admin/api/discounts";
import { DiscountDialog } from "./discount-dialog";

function discountState(d: Discount): { label: string; tone: BadgeTone } {
  const now = Date.now();
  if (!d.isActive) return { label: "Inactivo", tone: "neutral" };
  if (new Date(d.startsAt).getTime() > now) return { label: "Programado", tone: "info" };
  if (d.endsAt && new Date(d.endsAt).getTime() <= now) return { label: "Vencido", tone: "danger" };
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return { label: "Agotado", tone: "warning" };
  return { label: "Activo", tone: "success" };
}

function valueLabel(d: Discount): React.ReactNode {
  if (d.type === "percent") return `${d.value}%`;
  if (d.type === "fixed") return <Money value={d.value} />;
  return "Envío gratis";
}

function RedemptionsDialog({ discount, onClose }: { discount: Discount; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const query = useRedemptions(discount.id, page, 10);
  const data = query.data;
  return (
    <Dialog open onClose={onClose} size="lg" title={`Redenciones de ${discount.code}`} description={`${formatNumber(discount.usedCount)} uso(s)${discount.usageLimit ? ` de ${formatNumber(discount.usageLimit)}` : ""}`}>
      <DataTable
        aria-label="Redenciones del descuento"
        columns={[
          { key: "order", header: "Pedido", cell: (r) => (r.orderNumber !== null ? <Link className="font-medium text-accent-text hover:underline" href={`/orders/${r.orderId}`}>#{r.orderNumber}</Link> : "—") },
          { key: "email", header: "Correo", cell: (r) => r.email },
          { key: "amount", header: "Descontado", align: "right", cell: (r) => <Money value={r.amount} /> },
          { key: "date", header: "Fecha", cell: (r) => <DateTime value={r.createdAt} /> },
        ]}
        rows={data?.items ?? []}
        getRowId={(r) => r.id}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState title="Sin redenciones" description="Nadie ha usado este código todavía." />}
        pagination={data && data.total > 0 ? { page, pageSize: 10, total: data.total, onPageChange: setPage } : undefined}
      />
    </Dialog>
  );
}

export function DiscountsPage() {
  return (
    <PermissionGate perm="discounts:read">
      <DiscountsPageInner />
    </PermissionGate>
  );
}

function DiscountsPageInner() {
  const canWrite = useCan("discounts:write");
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const [viewing, setViewing] = useState<Discount | null>(null);
  const query = useDiscounts({ q, isActive: active, page, pageSize });
  const remove = useDeleteDiscount();
  const update = useUpdateDiscount();


  const onDelete = async (d: Discount) => {
    const ok = await confirm({
      title: `Eliminar ${d.code}`,
      description: "Esta acción no se puede deshacer. Si el código ya se usó, el servidor no permitirá eliminarlo.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(d.id);
      toast.success(`Descuento ${d.code} eliminado`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "DISCOUNT_IN_USE") {
        const deactivate = await confirm({
          title: "No se puede eliminar",
          description: `${d.code} ya tiene canjes registrados. En su lugar puedes desactivarlo para que deje de funcionar.`,
          confirmLabel: "Desactivar",
        });
        if (deactivate) {
          try {
            await update.mutateAsync({ id: d.id, patch: { isActive: false } });
            toast.success(`Descuento ${d.code} desactivado`);
          } catch (e2) {
            toast.error(apiMessage(e2));
          }
        }
        return;
      }
      toast.error(apiMessage(e));
    }
  };

  const columns: DataTableColumn<Discount>[] = [
    {
      key: "code",
      header: "Código",
      cell: (d) => (
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-semibold">{d.code}</p>
          <p className="truncate text-xs text-muted">{d.title}</p>
        </div>
      ),
    },
    { key: "type", header: "Tipo", hideOnMobile: true, cell: (d) => DISCOUNT_TYPE_LABELS[d.type] },
    { key: "value", header: "Valor", cell: (d) => valueLabel(d) },
    { key: "min", header: "Mínimo", hideOnMobile: true, align: "right", cell: (d) => (d.minSubtotal !== null ? <Money value={d.minSubtotal} /> : <span className="text-muted">—</span>) },
    { key: "uses", header: "Usos", align: "right", cell: (d) => `${formatNumber(d.usedCount)}${d.usageLimit ? ` / ${formatNumber(d.usageLimit)}` : ""}` },
    {
      key: "dates",
      header: "Vigencia",
      hideOnMobile: true,
      cell: (d) => (
        <span className="text-[13px]">
          <DateTime value={d.startsAt} mode="date" /> → {d.endsAt ? <DateTime value={d.endsAt} mode="date" /> : "sin fin"}
        </span>
      ),
    },
    {
      key: "state",
      header: "Estado",
      cell: (d) => {
        const s = discountState(d);
        return <Badge tone={s.tone} dot>{s.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: <ActionsHeader />,
      align: "right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton size="sm" label={`Ver redenciones de ${d.code}`} icon={<Eye aria-hidden size={15} />} onClick={() => setViewing(d)} />
          {canWrite ? (
            <>
              <IconButton size="sm" label={`Editar ${d.code}`} icon={<Pencil aria-hidden size={15} />} onClick={() => setEditing(d)} />
              <IconButton size="sm" variant="danger" label={`Eliminar ${d.code}`} icon={<Trash2 aria-hidden size={15} />} onClick={() => void onDelete(d)} />
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const data = query.data;
  const hasFilters = !!(q || active);
  return (
    <>
      <PageHeader
        title="Descuentos"
        description="Códigos de descuento por porcentaje, monto fijo o envío gratis."
        actions={
          <Can perm="discounts:write">
            <Button variant="primary" leftIcon={<Plus aria-hidden size={15} />} onClick={() => setEditing("new")}>
              Nuevo descuento
            </Button>
          </Can>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Buscar por código o título…" label="Buscar descuentos" />
        <Select
          aria-label="Filtrar por estado"
          value={active}
          onChange={(e) => { setActive(e.target.value as "" | "true" | "false"); setPage(1); }}
          options={[
            { value: "", label: "Estado: todos" },
            { value: "true", label: "Activos" },
            { value: "false", label: "Inactivos" },
          ]}
        />
      </div>
      <DataTable
        aria-label="Lista de descuentos"
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(d) => d.id}
        loading={query.isFetching}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={
          <EmptyState
            icon={<Percent aria-hidden size={22} />}
            title={hasFilters ? "Ningún descuento coincide" : "Aún no hay descuentos"}
            description={hasFilters ? "Prueba con otra búsqueda." : "Crea el primer código para impulsar tus ventas."}
            action={canWrite && !hasFilters ? <Button variant="primary" onClick={() => setEditing("new")}>Nuevo descuento</Button> : undefined}
          />
        }
        pagination={data ? { page, pageSize, total: data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />
      {editing ? <DiscountDialog key={editing === "new" ? "new" : editing.id} discount={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {viewing ? <RedemptionsDialog discount={viewing} onClose={() => setViewing(null)} /> : null}
    </>
  );
}
