"use client";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { EmptyState, Money, PageHeader, StatusBadge } from "@/components/admin/ui/Display";
import { Input, SearchInput, Select } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { Can } from "@/lib/admin/permissions";
import { errorMessage } from "@/lib/admin/errors";
import { bulkSummary, LOW_STOCK_THRESHOLD, useBulkProducts, useProducts, type ProductFilters } from "@/lib/admin/api/catalog";

export default function ProductsPage() {
  const router = useRouter(), confirm = useConfirm(), toast = useToast();
  const [f, setF] = useState<ProductFilters>({ q: "", status: "", tag: "", vendor: "", page: 1 });
  const [sel, setSel] = useState<string[]>([]);
  const set = (p: Partial<ProductFilters>) => { setF((x) => ({ ...x, page: 1, ...p })); setSel([]); };
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const onTag = useCallback((tag: string) => setF((x) => (x.tag === tag ? x : { ...x, tag, page: 1 })), []);
  const onVendor = useCallback((vendor: string) => setF((x) => (x.vendor === vendor ? x : { ...x, vendor, page: 1 })), []);
  const { data, isLoading, error } = useProducts(f);
  const bulk = useBulkProducts((r) => toast.success(bulkSummary(r)));
  const [tagOpen, setTagOpen] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const applyTag = () => {
    const tag = tagValue.trim().toLowerCase();
    if (!tag) return;
    bulk.mutate({ ids: sel, op: "tag", tag }, { onSuccess: () => { setSel([]); setTagOpen(false); setTagValue(""); } });
  };
  const BULK: Record<"publish" | "archive" | "delete", { title: string; verb: string; extra: string; danger: boolean }> = {
    publish: { title: "Publicar productos", verb: "publicarán", extra: "Los productos sin una variante activa con precio mayor a 0 se omitirán.", danger: false },
    archive: { title: "Archivar productos", verb: "archivarán", extra: "Dejarán de mostrarse en la tienda.", danger: true },
    delete: { title: "Eliminar productos", verb: "eliminarán", extra: "Dejarán de aparecer en la tienda y en las colecciones. Esta acción no se puede deshacer.", danger: true },
  };
  const here = (data?.items ?? []).filter((p) => sel.includes(p.id));
  const run = async (op: "publish" | "archive" | "delete") => {
    const b = BULK[op];
    const names = here.slice(0, 5).map((p) => `“${p.title}”`).join(", ");
    const more = sel.length - Math.min(here.length, 5);
    if (!(await confirm({ title: b.title, message: `Se ${b.verb} ${sel.length} producto${sel.length === 1 ? "" : "s"}${names ? `: ${names}${more > 0 ? ` y ${more} más` : ""}` : ""}. ${b.extra}`, danger: b.danger, confirmLabel: `${b.title.split(" ")[0]} ${sel.length}` }))) return;
    bulk.mutate({ ids: sel, op }, { onSuccess: () => setSel([]) });
  };
  return (
    <>
      <PageHeader title="Productos" actions={<Can perm="products:write"><Link href="/admin/products/new" className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white hover:brightness-110"><Plus className="size-4" />Nuevo producto</Link></Can>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput onSearch={onSearch} placeholder="Buscar producto" />
        <Select aria-label="Estado" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">Estado: todos</option><option value="active">Activo</option><option value="draft">Borrador</option><option value="archived">Archivado</option></Select>
        <SearchInput onSearch={onTag} placeholder="Etiqueta exacta" />
        <SearchInput onSearch={onVendor} placeholder="Proveedor exacto" />
      </div>
      {sel.length > 0 && (
        <Can perm="products:write"><div role="toolbar" aria-label="Acciones masivas" className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface p-2 text-sm">
          <span className="px-2">{sel.length} seleccionados</span>
          <Button size="sm" loading={bulk.isPending} onClick={() => void run("publish")}>Publicar</Button><Button size="sm" disabled={bulk.isPending} onClick={() => void run("archive")}>Archivar</Button>
          <Button size="sm" disabled={bulk.isPending} onClick={() => { setTagValue(""); setTagOpen(true); }}>Añadir etiqueta</Button><Button size="sm" variant="danger" disabled={bulk.isPending} onClick={() => void run("delete")}>Eliminar</Button>
        </div></Can>
      )}
      <DataTable caption="Lista de productos" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(p) => p.id} empty={<EmptyState title="Sin productos" text="No hay productos con esos filtros." />}
        selectable={{ selected: sel, onChange: setSel }} onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "t", header: "Producto", cell: (p) => <div className="flex items-center gap-3">{p.image ? <Image src={p.image.url} alt="" width={36} height={44} unoptimized loading={data?.items[0]?.id === p.id ? "eager" : "lazy"} className="h-11 w-9 rounded object-cover" /> : <span className="grid h-11 w-9 place-items-center rounded bg-surface2 text-[10px] text-muted" aria-hidden>—</span>}<div><p className="font-medium">{p.title}</p><p className="text-xs text-muted">/{p.handle}</p></div></div> },
          { key: "s", header: "Estado", cell: (p) => <StatusBadge status={p.status} /> },
          { key: "i", header: "Inventario", cell: (p) => <span className={p.inventoryTotal <= LOW_STOCK_THRESHOLD ? "text-warn" : ""}>{p.inventoryTotal} en {p.variantCount} variante(s)</span> },
          { key: "p", header: "Precio", align: "right", cell: (p) => p.minPrice === null ? "—" : <Money value={p.minPrice} /> },
        ]} />
      <Dialog open={tagOpen} onClose={() => setTagOpen(false)} title="Añadir etiqueta" size="sm"
        footer={<><Button onClick={() => setTagOpen(false)}>Cancelar</Button><Button variant="primary" loading={bulk.isPending} disabled={!tagValue.trim()} onClick={applyTag}>Añadir a {sel.length}</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); applyTag(); }}>
          <Input label="Etiqueta" value={tagValue} maxLength={50} onChange={(e) => setTagValue(e.target.value)} hint={`Se añadirá a ${sel.length} producto${sel.length === 1 ? "" : "s"} seleccionado${sel.length === 1 ? "" : "s"}${here.length ? `: ${here.slice(0, 3).map((p) => `“${p.title}”`).join(", ")}${sel.length > Math.min(here.length, 3) ? ` y ${sel.length - Math.min(here.length, 3)} más` : ""}` : ""}.`} />
        </form>
      </Dialog>
    </>
  );
}
