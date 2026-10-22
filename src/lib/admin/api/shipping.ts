"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";

export interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  price: number;
  freeOverSubtotal: number | null;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  departments: string[];
  isActive: boolean;
  rates: ShippingRate[];
  createdAt: string;
  updatedAt: string;
}

export interface ZoneInput {
  name: string;
  departments: string[];
  isActive: boolean;
}

export interface RateInput {
  name: string;
  price: number;
  freeOverSubtotal: number | null;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
  position: number;
}

export interface TaxSettings {
  pricesIncludeTax: boolean;
  ratePercent: number;
  label: string;
  updatedAt: string | null;
}

export type TaxInput = Pick<TaxSettings, "pricesIncludeTax" | "ratePercent" | "label">;

/** Departamentos de Colombia (más Bogotá D.C.). "*" = todo el país. */
export const COLOMBIA_DEPARTMENTS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
] as const;

const ZONES = ["shipping", "zones"] as const;
const TAXES = ["shipping", "taxes"] as const;

export function useZones() {
  return useQuery<ShippingZone[], ApiError>({
    queryKey: ZONES,
    queryFn: ({ signal }) => api.get<ShippingZone[]>("/admin/shipping/zones", { signal }),
  });
}

function useInvalidateZones() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ZONES });
}

export function useCreateZone() {
  const invalidate = useInvalidateZones();
  return useMutation<ShippingZone, ApiError, ZoneInput>({
    mutationFn: (body) => api.post<ShippingZone>("/admin/shipping/zones", body),
    onSuccess: invalidate,
  });
}

export function useUpdateZone() {
  const invalidate = useInvalidateZones();
  return useMutation<ShippingZone, ApiError, { id: string; patch: Partial<ZoneInput> }>({
    mutationFn: ({ id, patch }) => api.patch<ShippingZone>(`/admin/shipping/zones/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteZone() {
  const invalidate = useInvalidateZones();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/shipping/zones/${id}`),
    onSuccess: invalidate,
  });
}

export function useCreateRate() {
  const invalidate = useInvalidateZones();
  return useMutation<ShippingRate, ApiError, RateInput & { zoneId: string }>({
    mutationFn: (body) => api.post<ShippingRate>("/admin/shipping/rates", body),
    onSuccess: invalidate,
  });
}

export function useUpdateRate() {
  const invalidate = useInvalidateZones();
  return useMutation<ShippingRate, ApiError, { id: string; patch: Partial<RateInput> }>({
    mutationFn: ({ id, patch }) => api.patch<ShippingRate>(`/admin/shipping/rates/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteRate() {
  const invalidate = useInvalidateZones();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/shipping/rates/${id}`),
    onSuccess: invalidate,
  });
}

export function useTaxes() {
  return useQuery<TaxSettings, ApiError>({
    queryKey: TAXES,
    queryFn: ({ signal }) => api.get<TaxSettings>("/admin/taxes", { signal }),
  });
}

export function useUpdateTaxes() {
  const qc = useQueryClient();
  return useMutation<TaxSettings, ApiError, TaxInput>({
    mutationFn: (body) => api.put<TaxSettings>("/admin/taxes", body),
    onSuccess: (data) => qc.setQueryData(TAXES, data),
  });
}
