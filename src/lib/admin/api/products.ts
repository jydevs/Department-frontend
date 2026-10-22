"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, API_ORIGIN } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged, type PagedParams } from "@/lib/admin/query";
import { STOREFRONT_URL } from "@/lib/admin/utils";

/* ---------------------------------- tipos ---------------------------------- */

export type ProductStatus = "draft" | "active" | "archived";

export interface MediaRef {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface ProductListItem {
  id: string;
  handle: string;
  title: string;
  status: ProductStatus;
  variantCount: number;
  inventoryTotal: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  primaryImage: MediaRef | null;
}

export interface OptionValue {
  id: string;
  value: string;
  position: number;
  createdAt: string;
}

export interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
}

export interface Variant {
  id: string;
  sku: string | null;
  title: string;
  price: number;
  compareAtPrice: number | null;
  weightGrams: number | null;
  barcode: string | null;
  position: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  optionValueIds: string[];
  isActive: boolean;
  /** Concurrencia optimista: PATCH de la variante la exige. */
  version: number;
}

/** Respuesta de POST/PATCH de variante. */
export interface VariantFull extends Variant {
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  status: ProductStatus;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  options: ProductOption[];
  variants: Variant[];
  media: MediaRef[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface BulkResult {
  action: string;
  processed: string[];
  skipped: Array<{ id: string; reason: string }>;
}

export type BulkAction = "publish" | "archive" | "delete" | "add_tags" | "remove_tags";

export interface VariantInput {
  sku?: string | null;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  weightGrams?: number | null;
  barcode?: string | null;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  optionValueIds?: string[];
  /** Nombres de valor en el orden de `options` (alternativa a `optionValueIds` al crear el producto). */
  optionValues?: string[];
  isActive?: boolean;
}

export interface OptionInput {
  name: string;
  position?: number;
  values: Array<{ value: string; position?: number }>;
}

export interface CreateProductInput {
  title: string;
  descriptionHtml?: string;
  handle?: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  options?: OptionInput[];
  variants?: VariantInput[];
  /** Precio (COP) de las variantes generadas desde `options`. */
  defaultVariantPrice?: number;
}

export interface UpdateProductInput {
  title?: string;
  descriptionHtml?: string;
  handle?: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  version: number;
}

export interface UpdateVariantInput {
  sku?: string | null;
  title?: string;
  price?: number;
  compareAtPrice?: number | null;
  weightGrams?: number | null;
  barcode?: string | null;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  optionValueIds?: string[];
  isActive?: boolean;
}

export interface MediaInput {
  url: string;
  alt?: string | null;
  variantId?: string | null;
}

export type MetafieldType = "single_line_text" | "multi_line_text" | "number_integer" | "number_decimal" | "boolean" | "json" | "url" | "color";

export interface Metafield {
  id: string;
  ownerType: "product" | "collection";
  ownerId: string;
  namespace: string;
  key: string;
  type: MetafieldType;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetafieldInput {
  namespace: string;
  key: string;
  type: MetafieldType;
  value: string;
}

/* ----------------------- límites del servidor (DTO) ----------------------- */

export const LIMITS = {
  maxOptions: 3,
  maxVariants: 100,
  maxValuesPerOption: 100,
  maxTags: 50,
  tagLength: 50,
  maxMedia: 50,
  title: 255,
  descriptionHtml: 10000,
  seoTitle: 255,
  seoDescription: 1000,
  handle: 120,
} as const;

/* ---------------------------------- imágenes ---------------------------------- */

/**
 * URL mostrable de una imagen guardada por la API: absolutas http(s) tal cual, `/media/…` desde el origen
 * de la API y el resto de rutas (`/images/…`) desde la tienda. Cualquier otro esquema se descarta.
 */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const v = url.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return null;
  if (v.startsWith("/media/")) return `${API_ORIGIN}${v}`;
  if (v.startsWith("/")) return `${STOREFRONT_URL}${v}`;
  return null;
}

/* ---------------------------------- listas ---------------------------------- */

export interface ProductListParams extends PagedParams {
  status?: ProductStatus;
  q?: string;
  tag?: string;
  vendor?: string;
}

export function useProductList(params: ProductListParams, enabled = true) {
  return usePaged<ProductListItem>(["products", "list"], "/admin/products", params, { enabled });
}

export function useProduct(id: string | undefined, enabled = true) {
  return useQuery<ProductDetail, ApiError>({
    queryKey: ["products", "detail", id],
    queryFn: ({ signal }) => api.get<ProductDetail>(`/admin/products/${id}`, { signal }),
    enabled: !!id && enabled,
  });
}

/** Sugerencias de etiquetas, proveedores y tipos (GET /admin/products/facets). */
export function useCatalogFacets(enabled = true) {
  const q = useQuery<{ tags: string[]; vendors: string[]; productTypes: string[] }, ApiError>({
    queryKey: ["products", "facets"],
    queryFn: ({ signal }) => api.get<{ tags: string[]; vendors: string[]; productTypes: string[] }>("/admin/products/facets", { signal }),
    staleTime: 5 * 60_000,
    enabled,
  });
  return { tags: q.data?.tags ?? [], vendors: q.data?.vendors ?? [], types: q.data?.productTypes ?? [] };
}

/* ---------------------------------- mutaciones ---------------------------------- */

export const productsApi = {
  create: (body: CreateProductInput) => api.post<ProductDetail>("/admin/products", body),
  update: (id: string, body: UpdateProductInput) => api.patch<ProductDetail>(`/admin/products/${id}`, body),
  remove: (id: string) => api.delete<void>(`/admin/products/${id}`),
  duplicate: (id: string) => api.post<ProductDetail>(`/admin/products/${id}/duplicate`),
  publish: (id: string) => api.post<ProductDetail>(`/admin/products/${id}/publish`),
  archive: (id: string) => api.post<ProductDetail>(`/admin/products/${id}/archive`),
  bulk: (ids: string[], action: BulkAction, tags?: string[]) => api.post<BulkResult>("/admin/products/bulk", { ids, action, ...(tags ? { tags } : {}) }),
  updateOptions: (id: string, options: OptionInput[], force: boolean) => api.put<ProductDetail>(`/admin/products/${id}/options`, { options, force }),
  updateMedia: (id: string, media: MediaInput[]) => api.put<ProductDetail>(`/admin/products/${id}/media`, { media }),
  createVariant: (id: string, body: VariantInput) => api.post<VariantFull>(`/admin/products/${id}/variants`, body),
  deleteVariant: (id: string, variantId: string) => api.delete<void>(`/admin/products/${id}/variants/${variantId}`),
  getMetafields: (kind: "products" | "collections", id: string) => api.get<{ metafields: Metafield[] }>(`/admin/${kind}/${id}/metafields`),
  putMetafields: (kind: "products" | "collections", id: string, metafields: MetafieldInput[]) =>
    api.put<{ metafields: Metafield[] }>(`/admin/${kind}/${id}/metafields`, { metafields }),
  deleteMetafield: (kind: "products" | "collections", id: string, namespace: string, key: string) =>
    api.delete<void>(`/admin/${kind}/${id}/metafields/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`),
  updateVariant: (productId: string, variantId: string, body: UpdateVariantInput & { version: number }) => api.patch<VariantFull>(`/admin/products/${productId}/variants/${variantId}`, body),
};

export function invalidateProducts(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ queryKey: ["products"] });
}

export function useInvalidateProducts(): () => Promise<void> {
  const qc = useQueryClient();
  return () => invalidateProducts(qc);
}

/* ---------------------------------- metafields ---------------------------------- */

export function useMetafields(kind: "products" | "collections", id: string | undefined) {
  return useQuery<{ metafields: Metafield[] }, ApiError>({
    queryKey: [kind === "products" ? "products" : "collections", "metafields", id],
    queryFn: () => productsApi.getMetafields(kind, id as string),
    enabled: !!id,
  });
}
