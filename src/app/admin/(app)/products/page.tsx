"use client";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, Money, PageHeader, StatusBadge } from "@/components/admin/ui/Display";
import { Input, SearchInput, Select } from "@/components/admin/ui/Form";
import { Dialog, useConfirm } from "@/components/admin/ui/Overlay";
import { useToast } from "@/components/admin/ui/Toast";
import { Can } from "@/lib/admin/permissions";
import { errorMessage } from "@/lib/admin/errors";
import { useBulkProducts, useProductFacets, useProducts, type ProductFilters } from "@/lib/admin/api/catalog";

export default function ProductsPage() {
  const router = useRouter(), confirm = useConfirm(), toast = useToast();
  const [f, setF] = useState<ProductFilters>({ q: "", status: "", tag: "", vendor: "", page: 1 });
  const [sel, setSel] = useState<string[]>([]);
  const set = (p: Partial<ProductFilters>) => { setF((x) => ({ ...x, page: 1, ...p })); setSel([]); };
  const onSearch = useCallback((q: string) => setF((x) => (x.q === q ? x : { ...x, q, page: 1 })), []);
  const { data, isLoading, error } = useProducts(f);
  const facets = useProductFacets().data;
  const bulk = useBulkProducts();
  const [tagOpen, setTagOpen] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const applyTag = () => {
    const tag = tagValue.trim().toLowerCase();
    if (!tag) return;
    bulk.mutate({ ids: sel, op: "tag", tag }, { onSuccess: () => { setSel([]); setTagOpen(false); setTagValue(""); }, onError: (e) => toast.error(errorMessage(e)) });
  };
  const run = async (op: "publish" | "archive" | "delete") => {
    if (op === "delete" && !(await confirm({ title: "Eliminar productos", message: `Se eliminarán ${sel.length} productos de forma permanente.`, danger: true, confirmLabel: "Eliminar" }))) return;
    bulk.mutate({ ids: sel, op }, { onSuccess: () => setSel([]), onError: (e) => toast.error(errorMessage(e)) });
  };
  return (
    <>
      <PageHeader title="Productos" actions={<Can perm="products:write"><Link href="/admin/products/new" className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white hover:brightness-110"><Plus className="size-4" />Nuevo producto</Link></Can>} />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput onSearch={onSearch} placeholder="Buscar producto" />
        <Select aria-label="Estado" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">Estado: todos</option><option value="active">Activo</option><option value="draft">Borrador</option><option value="archived">Archivado</option></Select>
        <Select aria-label="Etiqueta" value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">Etiqueta: todas</option>{facets?.tags.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select aria-label="Proveedor" value={f.vendor} onChange={(e) => set({ vendor: e.target.value })}><option value="">Proveedor: todos</option>{facets?.vendors.map((t) => <option key={t}>{t}</option>)}</Select>
      </div>
      {sel.length > 0 && (
        <Can perm="products:write"><div role="toolbar" aria-label="Acciones masivas" className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface p-2 text-sm">
          <span className="px-2">{sel.length} seleccionados</span>
          <Button size="sm" loading={bulk.isPending} onClick={() => void run("publish")}>Publicar</Button><Button size="sm" onClick={() => void run("archive")}>Archivar</Button>
          <Button size="sm" onClick={() => { setTagValue(""); setTagOpen(true); }}>Añadir etiqueta</Button><Button size="sm" variant="danger" onClick={() => void run("delete")}>Eliminar</Button>
        </div></Can>
      )}
      <DataTable caption="Lista de productos" loading={isLoading} error={error ? errorMessage(error) : undefined} rows={data?.items} rowKey={(p) => p.id}
        selectable={{ selected: sel, onChange: setSel }} onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
        pagination={data && { page: data.page, totalPages: data.totalPages, total: data.total, onChange: (page) => setF((x) => ({ ...x, page })) }}
        columns={[
          { key: "t", header: "Producto", sortValue: (p) => p.title, cell: (p) => <div className="flex items-center gap-3"><Image src={p.images[0]?.url ?? ""} alt="" width={36} height={45} unoptimized className="h-11 w-9 rounded object-cover" /><div><p className="font-medium">{p.title}</p><p className="text-xs text-muted">{p.type} · {p.vendor}</p></div></div> },
          { key: "s", header: "Estado", cell: (p) => <StatusBadge status={p.status} /> },
          { key: "i", header: "Inventario", sortValue: (p) => p.variants.reduce((s, v) => s + v.stock, 0), cell: (p) => { const n = p.variants.reduce((s, v) => s + v.stock, 0); return <span className={n <= 5 ? "text-warn" : ""}>{n} en {p.variants.length} variantes</span>; } },
          { key: "g", header: "Etiquetas", cell: (p) => <div className="flex flex-wrap gap-1">{p.tags.slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          { key: "p", header: "Precio", align: "right", sortValue: (p) => p.variants[0]?.price ?? 0, cell: (p) => <Money value={Math.min(...p.variants.map((v) => v.price))} /> },
        ]} />
      <Dialog open={tagOpen} onClose={() => setTagOpen(false)} title="Añadir etiqueta" size="sm"
        footer={<><Button onClick={() => setTagOpen(false)}>Cancelar</Button><Button variant="primary" loading={bulk.isPending} disabled={!tagValue.trim()} onClick={applyTag}>Añadir a {sel.length}</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); applyTag(); }}>
          <Input label="Etiqueta" list="tag-suggestions" value={tagValue} onChange={(e) => setTagValue(e.target.value)} hint={`Se añadirá a ${sel.length} producto(s) seleccionados.`} />
          <datalist id="tag-suggestions">{facets?.tags.map((t) => <option key={t} value={t} />)}</datalist>
        </form>
      </Dialog>
    </>
  );
}
