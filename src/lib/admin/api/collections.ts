"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged, type PagedParams } from "@/lib/admin/query";

export type CollectionType = "manual" | "smart";
export type CollectionSort = "manual" | "title" | "newest" | "price_asc" | "price_desc";

export const SORT_LABELS: Record<CollectionSort, string> = {
  manual: "Manual",
  title: "Título (A-Z)",
  newest: "Más recientes",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
};

export type RuleField = "tag" | "vendor" | "type" | "price";
export type RuleOp = "eq" | "neq" | "gt" | "lt" | "contains";

export interface RuleCondition {
  field: RuleField;
  op: RuleOp;
  value: string | number;
}

export interface CollectionRules {
  match: "all" | "any";
  conditions: RuleCondition[];
}

/** Combinaciones campo/operador que acepta el servidor (collection-rule.dto.ts). */
export const RULE_FIELDS: Array<{ value: RuleField; label: string; ops: RuleOp[] }> = [
  { value: "tag", label: "Etiqueta", ops: ["eq", "neq", "contains"] },
  { value: "vendor", label: "Proveedor", ops: ["eq", "neq", "contains"] },
  { value: "type", label: "Tipo de producto", ops: ["eq", "neq", "contains"] },
  { value: "price", label: "Precio", ops: ["eq", "neq", "gt", "lt"] },
];

export const OP_LABELS: Record<RuleOp, string> = {
  eq: "es igual a",
  neq: "no es igual a",
  gt: "es mayor que",
  lt: "es menor que",
  contains: "contiene",
};

export const MAX_CONDITIONS = 20;

export interface Collection {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  type: CollectionType;
  rules: CollectionRules | null;
  sortOrder: CollectionSort;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  imageMediaId: string | null;
  /** Imagen resuelta desde `imageMediaId`. */
  image: { url: string; alt: string | null; width: number | null; height: number | null } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionInput {
  handle: string;
  title: string;
  descriptionHtml?: string;
  type: CollectionType;
  rules?: CollectionRules | null;
  sortOrder?: CollectionSort;
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageMediaId?: string | null;
  isPublished?: boolean;
}

/** `version` opcional: si difiere de la guardada el servidor responde 409 CONCURRENT_UPDATE. */
export type UpdateCollectionInput = Partial<Omit<CreateCollectionInput, "type">> & { version?: number };

export interface RulePreview {
  total: number;
  products: Array<{
    id: string;
    handle: string;
    title: string;
    price: number;
    image: { url: string; alt: string | null; width: number | null; height: number | null } | null;
  }>;
}

export function useCollectionList(params: PagedParams, enabled = true) {
  return usePaged<Collection>(["collections", "list"], "/admin/collections", params, { enabled });
}

export function useCollection(id: string | undefined, enabled = true) {
  return useQuery<Collection, ApiError>({
    queryKey: ["collections", "detail", id],
    queryFn: ({ signal }) => api.get<Collection>(`/admin/collections/${id}`, { signal }),
    enabled: !!id && enabled,
  });
}

export const collectionsApi = {
  create: (body: CreateCollectionInput) => api.post<Collection>("/admin/collections", body),
  update: (id: string, body: UpdateCollectionInput) => api.patch<Collection>(`/admin/collections/${id}`, body),
  remove: (id: string) => api.delete<void>(`/admin/collections/${id}`),
  setProducts: (id: string, productIds: string[]) => api.put<void>(`/admin/collections/${id}/products`, { products: productIds.map((productId) => ({ productId })) }),
  previewRules: (rules: CollectionRules, signal?: AbortSignal) => api.post<RulePreview>("/admin/collections/preview-rules", { rules }, { signal }),
};

export function useInvalidateCollections(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["collections"] });
}

/** Una regla es enviable si su valor cumple las reglas del servidor. */
export function isValidCondition(c: RuleCondition): boolean {
  if (c.field === "price") {
    const n = typeof c.value === "number" ? c.value : c.value.trim() === "" ? NaN : Number(c.value);
    return Number.isSafeInteger(n) && n >= 0;
  }
  return typeof c.value === "string" && c.value.trim() !== "" && c.value.length <= 255;
}

export function normalizeRules(r: CollectionRules): CollectionRules {
  return {
    match: r.match,
    conditions: r.conditions.map((c) => (c.field === "price" ? { ...c, value: Number(c.value) } : { ...c, value: String(c.value).trim() })),
  };
}

/** Producto de una colección manual (GET /admin/collections/:id/products), con borradores y archivados. */
export interface CollectionMember {
  id: string;
  handle: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  status?: "draft" | "active" | "archived";
}

interface CollectionProductsResponse {
  items: Array<{ id: string; handle: string; title: string; status: "draft" | "active" | "archived"; position: number; image: { url: string } | null; minPrice: number | null }>;
  total: number;
}

/** Productos de una colección manual, en orden. Una colección inteligente responde 409 COLLECTION_NOT_MANUAL. */
export function useCollectionProducts(id: string | undefined, enabled = true) {
  return useQuery<CollectionMember[], ApiError>({
    queryKey: ["collections", "products", id],
    enabled: !!id && enabled,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const res = await api.get<CollectionProductsResponse>(`/admin/collections/${id}/products`, { signal });
      return res.items.map((p) => ({ id: p.id, handle: p.handle, title: p.title, price: p.minPrice, imageUrl: p.image?.url ?? null, status: p.status }));
    },
  });
}
