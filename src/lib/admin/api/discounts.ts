"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged } from "@/lib/admin/query";

export type DiscountType = "percent" | "fixed" | "free_shipping";

export interface Discount {
  id: string;
  code: string;
  title: string;
  type: DiscountType;
  value: number;
  minSubtotal: number | null;
  startsAt: string;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  oncePerEmail: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountRedemption {
  id: string;
  orderId: string;
  orderNumber: number | null;
  email: string;
  amount: number;
  createdAt: string;
}

export interface DiscountCreate {
  code: string;
  title: string;
  type: DiscountType;
  value: number;
  minSubtotal: number | null;
  startsAt?: string;
  endsAt: string | null;
  usageLimit: number | null;
  oncePerEmail: boolean;
  isActive: boolean;
}

export type DiscountUpdate = Partial<Omit<DiscountCreate, "code" | "type">>;

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Porcentaje",
  fixed: "Monto fijo",
  free_shipping: "Envío gratis",
};

const KEY = ["discounts"] as const;

export function useDiscounts(params: { q?: string; isActive?: "" | "true" | "false"; page: number; pageSize: number }) {
  return usePaged<Discount>(KEY, "/admin/discounts", params);
}

export function useRedemptions(id: string | null, page: number, pageSize: number) {
  return usePaged<DiscountRedemption>([...KEY, "redemptions", id], `/admin/discounts/${id}/redemptions`, { page, pageSize }, { enabled: id !== null });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation<Discount, ApiError, DiscountCreate>({
    mutationFn: (body) => api.post<Discount>("/admin/discounts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation<Discount, ApiError, { id: string; patch: DiscountUpdate }>({
    mutationFn: ({ id, patch }) => api.patch<Discount>(`/admin/discounts/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/discounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
