"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { Link } from "@/lib/admin/navigation";
import { Archive, Copy, Eye, PackagePlus, Plus, Tag, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  LinkButton,
  Menu,
  NoAccess,
  PageHeader,
  Input,
  SearchInput,
  Select,
  StatusBadge,
  TagInput,
  useConfirm,
  useToast,
  type DataTableColumn,
} from "@/components/admin/ui";
import {
  productsApi,
  useCatalogFacets,
  useInvalidateProducts,
  useProductList,
  type BulkAction,
  type BulkResult,
  type ProductListItem,
  type ProductStatus,
} from "@/lib/admin/api/products";
import { formatCop, formatNumber } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { STOREFRONT_URL } from "@/lib/admin/utils";
import { Thumb } from "./product-image";
import { useAction } from "./use-action";

export const SKIP_REASONS: Record<string, string> = {
  ALREADY_ACTIVE: "Ya está publicado",
  ALREADY_ARCHIVED: "Ya está archivado",
  NO_ACTIVE_VARIANT_WITH_PRICE: "Necesita al menos una variante activa con precio mayor a $0",
  NOT_FOUND: "No existe (puede que ya se haya eliminado)",
  NO_CHANGE: "Sin cambios (ya tenía/no tenía esas etiquetas)",
};

export function priceRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return "—";
  return min === max ? formatCop(min) : `${formatCop(min)} – ${formatCop(max)}`;
}

const ACTION_LABEL: Record<BulkAction, [string, string]> = {
  publish: ["publicado", "publicados"],
  archive: ["archivado", "archivados"],
  delete: ["eliminado", "eliminados"],
  add_tags: ["actualizado", "actualizados"],
  remove_tags: ["actualizado", "actualizados"],
};

export function ProductList() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const canRead = useCan("products:read");
  const canWrite = useCan("products:write");
  const invalidate = useInvalidateProducts();
  const { run } = useAction();
  // las sugerencias de etiquetas/proveedores cuestan varias peticiones: solo se piden al usarlas
  const [facetsOn, setFacetsOn] = useState(false);
  const facets = useCatalogFacets(canRead && facetsOn);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [tag, setTag] = useState("");
  const [vendor, setVendor] = useState("");
  const [tagText, setTagText] = useState("");
  const [vendorText, setVendorText] = useState("");
  const commitTag = (v: string) => {
    const t = v.trim();
    if (t !== tag) {
      setTag(t);
      setPage(1);
    }
  };
  const commitVendor = (v: string) => {
    const t = v.trim();
    if (t !== vendor) {
      setVendor(t);
      setPage(1);
    }
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagDialog, setTagDialog] = useState<"add_tags" | "remove_tags" | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [result, setResult] = useState<{ res: BulkResult; titles: Map<string, string> } | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const titles = useState(() => new Map<string, string>())[0];

  const list = useProductList({ page, pageSize, q: q || undefined, status: status || undefined, tag: tag || undefined, vendor: vendor || undefined }, canRead);
  const rows = list.data?.items ?? [];
  rows.forEach((r) => titles.set(r.id, r.title));
  const filtered = !!(q || status || tag || vendor);

  if (!canRead) return <NoAccess permission="products:read" />;

  const resetPage = () => {
    setPage(1);
  };

  const doBulk = async (action: BulkAction, tags?: string[]) => {
    const ids = [...selected];
    if (!ids.length) return;
    if (ids.length > 100) {
      toast.warning("Puedes aplicar acciones masivas a un máximo de 100 productos a la vez.");
      return;
    }
    setBusyBulk(true);
    const r = await run(() => productsApi.bulk(ids, action, tags), { silentError: false });
    setBusyBulk(false);
    if (!r.ok || !r.data) return;
    await invalidate();
    setSelected(new Set());
    setTagDialog(null);
    const n = r.data.processed.length;
    if (r.data.skipped.length) setResult({ res: r.data, titles: new Map(titles) });
    if (n) toast.success(`${n} producto${n === 1 ? "" : "s"} ${ACTION_LABEL[action][n === 1 ? 0 : 1]}.`);
    else toast.warning("No se modificó ningún producto.");
  };

  const rowAction = async (row: ProductListItem, action: "duplicate" | "publish" | "archive" | "delete") => {
    if (action === "delete") {
      const ok = await confirm({
        title: `¿Eliminar «${row.title}»?`,
        description: "El producto dejará de mostrarse en la tienda y se quitará de las colecciones manuales. Sus SKU se liberan.",
        confirmLabel: "Eliminar",
        tone: "danger",
      });
      if (!ok) return;
      const r = await run(() => productsApi.remove(row.id), { success: "Producto eliminado." });
      if (r.ok) await invalidate();
      return;
    }
    if (action === "duplicate") {
      const r = await run(() => productsApi.duplicate(row.id), { success: "Producto duplicado como borrador." });
      if (r.ok && r.data) {
        await invalidate();
        router.push(`/products/${r.data.id}`);
      }
      return;
    }
    const fn = action === "publish" ? productsApi.publish : productsApi.archive;
    const r = await run(() => fn(row.id), { success: action === "publish" ? "Producto publicado." : "Producto archivado." });
    if (r.ok) await invalidate();
  };

  const columns: DataTableColumn<ProductListItem>[] = [
    {
      key: "title",
      header: "Producto",
      cell: (p) => (
        <Link href={`/products/${p.id}`} className="flex min-w-0 items-center gap-3 rounded hover:underline" onClick={(e) => e.stopPropagation()}>
          <Thumb url={p.primaryImage?.url} alt={p.primaryImage?.alt} size={44} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.title}</span>
            <span className="block truncate text-xs text-muted">/{p.handle}</span>
            <span className="mt-1 flex items-center gap-2 md:hidden">
              <StatusBadge status={p.status} />
              <span className="text-xs tabular-nums">{priceRange(p.minPrice, p.maxPrice)}</span>
            </span>
          </span>
        </Link>
      ),
    },
    { key: "status", header: "Estado", hideOnMobile: true, cell: (p) => <StatusBadge status={p.status} /> },
    { key: "variants", header: "Variantes", align: "right", hideOnMobile: true, cell: (p) => <span className="tabular-nums">{formatNumber(p.variantCount)}</span> },
    { key: "price", header: "Precio", align: "right", hideOnMobile: true, cell: (p) => <span className="tabular-nums">{priceRange(p.minPrice, p.maxPrice)}</span> },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      hideOnMobile: true,
      cell: (p) =>
        p.inventoryTotal === null ? (
          "—"
        ) : p.inventoryTotal <= 0 ? (
          <Badge tone="danger">Agotado</Badge>
        ) : (
          <span className="tabular-nums">{formatNumber(p.inventoryTotal)}</span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      width: "56px",
      cell: (p) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`Acciones de ${p.title}`}
            items={[
              { label: "Editar", icon: <PackagePlus aria-hidden size={14} />, onSelect: () => router.push(`/products/${p.id}`) },
              ...(p.status === "active" ? [{ label: "Ver en la tienda", icon: <Eye aria-hidden size={14} />, onSelect: () => window.open(`${STOREFRONT_URL}/products/${p.handle}`, "_blank", "noopener,noreferrer") }] : []),
              ...(canWrite
                ? [
                    { label: "Duplicar", icon: <Copy aria-hidden size={14} />, onSelect: () => void rowAction(p, "duplicate") },
                    p.status === "active"
                      ? { label: "Archivar", icon: <Archive aria-hidden size={14} />, onSelect: () => void rowAction(p, "archive") }
                      : { label: "Publicar", icon: <Upload aria-hidden size={14} />, onSelect: () => void rowAction(p, "publish") },
                    { label: "Eliminar", icon: <Trash2 aria-hidden size={14} />, danger: true, onSelect: () => void rowAction(p, "delete") },
                  ]
                : []),
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo: precios, variantes, medios y publicación."
        actions={
          canWrite ? (
            <LinkButton href="/products/new" variant="primary" leftIcon={<Plus aria-hidden size={16} />}>
              Nuevo producto
            </LinkButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            resetPage();
          }}
          placeholder="Buscar por título, handle o SKU…"
          label="Buscar productos"
        />
        <Select aria-label="Estado" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ""); resetPage(); }}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="draft">Borradores</option>
          <option value="archived">Archivados</option>
        </Select>
        <Input
          aria-label="Etiqueta"
          placeholder="Etiqueta (exacta)"
          list="dept-filter-tags"
          maxLength={50}
          value={tagText}
          onFocus={() => setFacetsOn(true)}
          onChange={(e) => {
            setTagText(e.target.value);
            if (facets.tags.includes(e.target.value)) commitTag(e.target.value);
          }}
          onBlur={() => commitTag(tagText)}
          onKeyDown={(e) => e.key === "Enter" && commitTag(tagText)}
        />
        <datalist id="dept-filter-tags">
          {facets.tags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Input
          aria-label="Proveedor"
          placeholder="Proveedor (exacto)"
          list="dept-filter-vendors"
          maxLength={255}
          value={vendorText}
          onFocus={() => setFacetsOn(true)}
          onChange={(e) => {
            setVendorText(e.target.value);
            if (facets.vendors.includes(e.target.value)) commitVendor(e.target.value);
          }}
          onBlur={() => commitVendor(vendorText)}
          onKeyDown={(e) => e.key === "Enter" && commitVendor(vendorText)}
        />
        <datalist id="dept-filter-vendors">
          {facets.vendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        {filtered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setStatus("");
              setTag("");
              setVendor("");
              setTagText("");
              setVendorText("");
              resetPage();
            }}
          >
            Limpiar
          </Button>
        ) : null}
      </div>

      {canWrite && selected.size > 0 ? (
        <div role="region" aria-label="Acciones masivas" className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5">
          <span className="mr-2 text-sm font-medium">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
          <Button size="sm" loading={busyBulk} leftIcon={<Upload aria-hidden size={14} />} onClick={() => void doBulk("publish")}>
            Publicar
          </Button>
          <Button size="sm" loading={busyBulk} leftIcon={<Archive aria-hidden size={14} />} onClick={() => void doBulk("archive")}>
            Archivar
          </Button>
          <Button size="sm" leftIcon={<Tag aria-hidden size={14} />} onClick={() => { setFacetsOn(true); setTagsDraft([]); setTagDialog("add_tags"); }}>
            Añadir etiquetas
          </Button>
          <Button size="sm" onClick={() => { setFacetsOn(true); setTagsDraft([]); setTagDialog("remove_tags"); }}>
            Quitar etiquetas
          </Button>
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 aria-hidden size={14} />}
            onClick={async () => {
              const ok = await confirm({
                title: `¿Eliminar ${selected.size} producto${selected.size === 1 ? "" : "s"}?`,
                description: "Dejarán de mostrarse en la tienda y se quitarán de las colecciones manuales. Esta acción no se puede deshacer desde el panel.",
                confirmLabel: "Eliminar",
                tone: "danger",
              });
              if (ok) await doBulk("delete");
            }}
          >
            Eliminar
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Deseleccionar
          </Button>
        </div>
      ) : null}

      <DataTable
        aria-label="Lista de productos"
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        loading={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(p) => router.push(`/products/${p.id}`)}
        selection={canWrite ? { selected, onChange: setSelected } : undefined}
        empty={
          <EmptyState
            icon={<PackagePlus aria-hidden size={22} />}
            title={filtered ? "Ningún producto coincide" : "Aún no hay productos"}
            description={filtered ? "Prueba con otros filtros o limpia la búsqueda." : "Crea tu primer producto para empezar a vender."}
            action={
              canWrite && !filtered ? (
                <LinkButton href="/products/new" variant="primary">
                  Nuevo producto
                </LinkButton>
              ) : undefined
            }
          />
        }
        pagination={list.data ? { page, pageSize, total: list.data.total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } } : undefined}
      />

      <Dialog
        open={tagDialog !== null}
        onClose={() => setTagDialog(null)}
        size="sm"
        title={tagDialog === "add_tags" ? "Añadir etiquetas" : "Quitar etiquetas"}
        description={`Se aplicará a ${selected.size} producto${selected.size === 1 ? "" : "s"}.`}
        footer={
          <>
            <Button onClick={() => setTagDialog(null)}>Cancelar</Button>
            <Button variant="primary" loading={busyBulk} disabled={tagsDraft.length === 0} onClick={() => tagDialog && void doBulk(tagDialog, tagsDraft)}>
              Aplicar
            </Button>
          </>
        }
      >
        <TagInput label="Etiquetas" value={tagsDraft} onChange={setTagsDraft} suggestions={facets.tags} maxLength={50} />
      </Dialog>

      <Dialog
        open={result !== null}
        onClose={() => setResult(null)}
        title="Algunos productos se omitieron"
        description="El servidor no aplicó la acción a estos productos:"
        footer={<Button variant="primary" onClick={() => setResult(null)}>Entendido</Button>}
      >
        <ul className="flex flex-col gap-2 text-sm">
          {result?.res.skipped.map((s) => (
            <li key={s.id} className="rounded-md bg-surface-2 px-3 py-2">
              <span className="font-medium">{result.titles.get(s.id) ?? s.id}</span>
              <span className="block text-muted">{SKIP_REASONS[s.reason] ?? s.reason}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

