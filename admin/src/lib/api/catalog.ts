"use client";
import { db, nid, now, paginate } from "../mock/db";
import { useAction, useMock, usePaged } from "../query";
import { slugify } from "../format";
import type { Collection, Location, Product, ProductStatus, Rule, Variant } from "../types";

/* ---------- Productos ---------- */
export interface ProductFilters { q: string; status: string; tag: string; vendor: string; page: number }
const PAGE = 10;
export const useProducts = (f: ProductFilters) =>
  usePaged<Product>(["products", f], { page: f.page, pageSize: PAGE }, () => {
    const q = f.q.toLowerCase();
    return paginate(db().products.filter((p) => (!q || p.title.toLowerCase().includes(q)) && (!f.status || p.status === f.status) && (!f.tag || p.tags.includes(f.tag)) && (!f.vendor || p.vendor === f.vendor)), f.page, PAGE);
  });
export const useProduct = (id: string) => useMock(["product", id], () => db().products.find((p) => p.id === id) ?? null);
export const useProductFacets = () => useMock(["product-facets"], () => ({ tags: [...new Set(db().products.flatMap((p) => p.tags))].sort(), vendors: [...new Set(db().products.map((p) => p.vendor))].sort(), types: [...new Set(db().products.map((p) => p.type))].sort() }));
export const useAllProducts = () => useMock(["products-all"], () => db().products);

export const blankProduct = (): Product => ({ id: "", handle: "", title: "", description: "", status: "draft", vendor: "Daregular Dept.", type: "", tags: [], seoTitle: "", seoDescription: "", options: [], variants: [{ id: nid("var"), title: "Predeterminado", options: [], price: 0, sku: "", tracked: true, backorder: false, stock: 0 }], images: [], metafields: [], updatedAt: now() });

export const useSaveProduct = (onSaved?: (p: Product) => void) => useAction((p: Product) => {
  if (!p.title.trim()) throw new Error("El título es obligatorio");
  const d = db(); const handle = p.handle || slugify(p.title);
  if (d.products.some((x) => x.handle === handle && x.id !== p.id)) throw new Error("Ya existe un producto con ese handle");
  const saved = { ...p, handle, updatedAt: now() };
  if (!p.id) { saved.id = nid("prd"); d.products.unshift(saved); } else d.products = d.products.map((x) => (x.id === p.id ? saved : x));
  return saved;
}, { invalidate: [["products"], ["product"], ["products-all"], ["product-facets"], ["levels"]], success: "Producto guardado", onSuccess: onSaved });
export const useBulkProducts = () => useAction(({ ids, op, tag }: { ids: string[]; op: "publish" | "archive" | "delete" | "tag"; tag?: string }) => {
  const d = db();
  if (op === "delete") d.products = d.products.filter((p) => !ids.includes(p.id));
  else for (const p of d.products) if (ids.includes(p.id)) { if (op === "publish") p.status = "active"; else if (op === "archive") p.status = "archived"; else if (tag && !p.tags.includes(tag)) p.tags.push(tag); }
}, { invalidate: [["products"], ["products-all"], ["product"]], success: "Acción aplicada" });
export const useSetProductStatus = () => useAction(({ id, status }: { id: string; status: ProductStatus }) => { const p = db().products.find((x) => x.id === id); if (p) p.status = status; }, { invalidate: [["products"], ["product"]], success: "Estado actualizado" });
export const useDuplicateProduct = (onDone?: (p: Product) => void) => useAction((id: string) => {
  const d = db(); const src = d.products.find((p) => p.id === id); if (!src) throw new Error("No encontrado");
  const copy: Product = { ...structuredClone(src), id: nid("prd"), title: `${src.title} (copia)`, handle: `${src.handle}-copia-${Math.random().toString(36).slice(2, 5)}`, status: "draft", updatedAt: now() };
  copy.variants = copy.variants.map((v) => ({ ...v, id: nid("var"), sku: `${v.sku}-C` })); d.products.unshift(copy); return copy;
}, { invalidate: [["products"]], success: "Producto duplicado", onSuccess: onDone });
export const useDeleteProduct = (onDone?: () => void) => useAction((id: string) => { const d = db(); d.products = d.products.filter((p) => p.id !== id); }, { invalidate: [["products"], ["products-all"]], success: "Producto eliminado", onSuccess: onDone });

/** Genera el producto cartesiano de las opciones conservando precio/stock de variantes existentes. */
export function generateVariants(options: Product["options"], prev: Variant[], base: Variant | undefined): Variant[] {
  const opts = options.filter((o) => o.name && o.values.length);
  if (!opts.length) return prev.length ? [prev[0]] : [];
  const combos = opts.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
  return combos.map((c) => {
    const title = c.join(" / ");
    return prev.find((v) => v.title === title) ?? { id: nid("var"), title, options: c, price: base?.price ?? 0, compareAt: base?.compareAt, sku: `${(base?.sku || "SKU").replace(/-[^-]*$/, "")}-${c.join("").toUpperCase()}`, weight: base?.weight, tracked: true, backorder: false, stock: 0 };
  });
}

/* ---------- Colecciones ---------- */
export const useCollections = () => useMock(["collections"], () => db().collections.map((c) => ({ ...c, count: matchProducts(c).length })));
export const useCollection = (id: string) => useMock(["collection", id], () => db().collections.find((c) => c.id === id) ?? null);
export function matchProducts(c: Pick<Collection, "kind" | "productIds" | "rules" | "match">, products: Product[] = db().products): Product[] {
  if (c.kind === "manual") return c.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  if (!c.rules.length) return [];
  const test = (p: Product, r: Rule): boolean => {
    const v = r.value.toLowerCase();
    if (r.field === "tag") return r.op === "contains" ? p.tags.some((t) => t.includes(v)) : p.tags.includes(v);
    if (r.field === "price") { const price = Math.min(...p.variants.map((x) => x.price)); return r.op === "gt" ? price > Number(v) : r.op === "lt" ? price < Number(v) : price === Number(v); }
    const field = (r.field === "type" ? p.type : r.field === "vendor" ? p.vendor : p.title).toLowerCase();
    return r.op === "contains" ? field.includes(v) : field === v;
  };
  return products.filter((p) => (c.match === "all" ? c.rules.every((r) => test(p, r)) : c.rules.some((r) => test(p, r))));
}
export const usePreviewRules = (c: Pick<Collection, "kind" | "productIds" | "rules" | "match">) => useMock(["preview-rules", c.rules, c.match, c.kind, c.productIds], () => matchProducts(c));
export const blankCollection = (): Collection => ({ id: "", handle: "", title: "", description: "", kind: "manual", published: false, productIds: [], rules: [], match: "all", sort: "manual", image: "", seoTitle: "", seoDescription: "", metafields: [] });
export const useSaveCollection = (onSaved?: (c: Collection) => void) => useAction((c: Collection) => {
  if (!c.title.trim()) throw new Error("El título es obligatorio");
  const d = db(); const saved = { ...c, handle: c.handle || slugify(c.title) };
  if (!c.id) { saved.id = nid("col"); d.collections.push(saved); } else d.collections = d.collections.map((x) => (x.id === c.id ? saved : x));
  return saved;
}, { invalidate: [["collections"], ["collection"]], success: "Colección guardada", onSuccess: onSaved });
export const useDeleteCollection = (onDone?: () => void) => useAction((id: string) => { const d = db(); d.collections = d.collections.filter((c) => c.id !== id); }, { invalidate: [["collections"]], success: "Colección eliminada", onSuccess: onDone });

/* ---------- Inventario ---------- */
export const useLevels = (q: string, locationId: string) => useMock(["levels", q, locationId], () => {
  const locs = db().locations.filter((l) => l.active);
  return db().products.flatMap((p) => p.variants.map((v) => ({ productId: p.id, product: p.title, variant: v, byLocation: locs.map((l, i) => ({ id: l.id, name: l.name, qty: i === 0 ? v.stock : Math.floor(v.stock / 3) })) })))
    .filter((r) => !q || r.product.toLowerCase().includes(q.toLowerCase()) || r.variant.sku.toLowerCase().includes(q.toLowerCase()))
    .map((r) => ({ ...r, shown: locationId ? r.byLocation.find((b) => b.id === locationId)?.qty ?? 0 : r.variant.stock }));
});
export const useAdjustStock = () => useAction(({ variantId, delta, reason }: { variantId: string; delta: number; reason: string }) => {
  for (const p of db().products) { const v = p.variants.find((x) => x.id === variantId); if (v) {
    if (v.stock + delta < 0) throw new Error("El stock no puede quedar negativo");
    v.stock += delta; db().adjustments.unshift({ id: nid("adj"), variantId, productTitle: p.title, variantTitle: v.title, delta, reason, at: now(), actor: "owner@daregulardept.com" }); } }
}, { invalidate: [["levels"], ["product"], ["products"], ["adjustments"], ["alerts"]], success: "Stock ajustado" });
export const useAdjustments = () => useMock(["adjustments"], () => db().adjustments);
export const useLocations = () => useMock(["locations"], () => db().locations);
export const useSaveLocation = () => useAction((l: Location) => { const d = db(); if (!l.name.trim()) throw new Error("El nombre es obligatorio"); if (!l.id) d.locations.push({ ...l, id: nid("loc") }); else d.locations = d.locations.map((x) => (x.id === l.id ? l : x)); }, { invalidate: [["locations"], ["levels"]], success: "Ubicación guardada" });
export const useDeleteLocation = () => useAction((id: string) => { const d = db(); if (d.locations.length <= 1) throw new Error("Debe existir al menos una ubicación"); d.locations = d.locations.filter((l) => l.id !== id); }, { invalidate: [["locations"], ["levels"]], success: "Ubicación eliminada" });
