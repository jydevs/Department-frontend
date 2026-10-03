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
import { bulkSummary, useBulkProducts, useProducts, type ProductFilters } from "@/lib/admin/api/catalog";

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
  const run = async (op: "publish" | "archive" | "delete") => {
    if (op === "delete" && !(await confirm({ title: "Eliminar productos", message: `Se eliminarán ${sel.length} productos de forma permanente.`, danger: true, confirmLabel: "Eliminar" }))) return;
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
          <Button size="sm" loading={bulk.isPending} onClick={() => void run("publish")}>Publicar</Button><Button size="sm" onClick={() => void run("archive")}>Archivar</Button>
          <Button size="sm" onClick={() => { setTagValue(""); setTagOpen(true); }}>Añadir etiqueta</Button><Button size="sm" variant="danger" onClick={() => void run("delete")}>Eliminar</Button>
        </div></Can>
      )}
      <DataTable caption="Lista de productos" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(p) => p.id} empty={<EmptyState title="Sin productos" text="No hay productos con esos filtros." />}
        selectable={{ selected: sel, onChange: setSel }} onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "t", header: "Producto", cell: (p) => <div className="flex items-center gap-3">{p.image ? <Image src={p.image.url} alt="" width={36} height={45} unoptimized className="h-11 w-9 rounded object-cover" /> : <span className="grid h-11 w-9 place-items-center rounded bg-surface2 text-[10px] text-muted" aria-hidden>—</span>}<div><p className="font-medium">{p.title}</p><p className="text-xs text-muted">/{p.handle}</p></div></div> },
          { key: "s", header: "Estado", cell: (p) => <StatusBadge status={p.status} /> },
          { key: "i", header: "Inventario", cell: (p) => <span className={p.inventoryTotal <= 5 ? "text-warn" : ""}>{p.inventoryTotal} en {p.variantCount} variante(s)</span> },
          { key: "p", header: "Precio", align: "right", cell: (p) => p.minPrice === null ? "—" : <Money value={p.minPrice} /> },
        ]} />
      <Dialog open={tagOpen} onClose={() => setTagOpen(false)} title="Añadir etiqueta" size="sm"
        footer={<><Button onClick={() => setTagOpen(false)}>Cancelar</Button><Button variant="primary" loading={bulk.isPending} disabled={!tagValue.trim()} onClick={applyTag}>Añadir a {sel.length}</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); applyTag(); }}>
          <Input label="Etiqueta" value={tagValue} onChange={(e) => setTagValue(e.target.value)} hint={`Se añadirá a ${sel.length} producto(s) seleccionados.`} />
        </form>
      </Dialog>
    </>
  );
}
