"use client";

import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged, type CursorPage, type PagedParams } from "@/lib/admin/query";

export interface Location {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLevel {
  id: string;
  variantId: string;
  variantTitle: string;
  variantSku: string | null;
  productId: string | null;
  productTitle: string | null;
  productHandle: string | null;
  locationId: string;
  locationName: string;
  onHand: number;
  reserved: number;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdjustReason = "received" | "correction" | "sold" | "returned" | "damaged" | "restock" | "other";

export const ADJUST_REASONS: Array<{ value: AdjustReason; label: string }> = [
  { value: "received", label: "Mercancía recibida" },
  { value: "restock", label: "Reposición" },
  { value: "correction", label: "Corrección de conteo" },
  { value: "returned", label: "Devolución" },
  { value: "damaged", label: "Dañado o perdido" },
  { value: "sold", label: "Venta fuera de línea" },
  { value: "other", label: "Otro" },
];

export function reasonLabel(reason: string): string {
  return ADJUST_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export interface InventoryAdjustment {
  id: string;
  variantId: string;
  variantTitle: string | null;
  productId: string | null;
  productTitle: string | null;
  productHandle: string | null;
  locationId: string;
  delta: number;
  reason: string;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface AdjustInput {
  variantId: string;
  locationId: string;
  delta?: number;
  setTo?: number;
  reason: AdjustReason;
  note?: string;
}

export const QTY_MAX = 1_000_000;

export interface InventoryParams extends PagedParams {
  q?: string;
  locationId?: string;
  lowStock?: boolean;
  lowStockThreshold?: number;
}

export function useInventoryLevels(params: InventoryParams, enabled = true) {
  return usePaged<InventoryLevel>(["inventory", "levels"], "/admin/inventory", params, { enabled });
}

export function useLocations(enabled = true) {
  return useQuery<Location[], ApiError>({
    queryKey: ["inventory", "locations"],
    queryFn: ({ signal }) => api.get<Location[]>("/admin/locations", { signal }),
    enabled,
  });
}

/** Historial de ajustes con cursor, acumulando páginas ("Cargar más"). */
export function useAdjustmentHistory(variantId?: string, enabled = true) {
  return useInfiniteQuery<CursorPage<InventoryAdjustment>, ApiError, { pages: CursorPage<InventoryAdjustment>[] }, unknown[], string | null>({
    queryKey: ["inventory", "adjustments", variantId ?? "all"],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      api.get<CursorPage<InventoryAdjustment>>("/admin/inventory/adjustments", { query: { limit: 25, cursor: pageParam, variantId }, signal }),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Niveles de las variantes de un producto. El API no filtra por variante, así que se busca por el título
 * de cada variante (`q`) y se filtra aquí por id.
 */
export function useVariantLevels(variantIds: string[], titles: string[], enabled = true) {
  const key = [...variantIds].sort().join(",");
  const distinct = [...new Set(titles)].slice(0, 30);
  return useQuery<InventoryLevel[], ApiError>({
    queryKey: ["inventory", "variant-levels", key],
    enabled: enabled && variantIds.length > 0,
    queryFn: async ({ signal }) => {
      const wanted = new Set(variantIds);
      const found = new Map<string, InventoryLevel>();
      for (const q of distinct) {
        for (let page = 1; page <= 5; page++) {
          const res = await api.get<{ items: InventoryLevel[]; totalPages: number }>("/admin/inventory", { query: { q, pageSize: 100, page }, signal });
          for (const l of res.items) if (wanted.has(l.variantId)) found.set(l.id, l);
          if (page >= res.totalPages) break;
        }
      }
      return [...found.values()];
    },
  });
}

export const inventoryApi = {
  adjust: (body: AdjustInput) => api.post<InventoryAdjustment>("/admin/inventory/adjust", body),
  createLocation: (name: string) => api.post<Location>("/admin/locations", { name }),
  updateLocation: (id: string, body: { name?: string; isDefault?: boolean; isActive?: boolean; replacementDefaultId?: string }) =>
    api.patch<Location>(`/admin/locations/${id}`, body),
  deleteLocation: (id: string) => api.delete<void>(`/admin/locations/${id}`),
};

export function useInvalidateInventory(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["products"] })]);
  };
}
