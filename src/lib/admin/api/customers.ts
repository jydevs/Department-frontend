"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, saveBlob, type QueryParams } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged, type Paged } from "@/lib/admin/query";

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  marketingConsentAt: string | null;
  isActive: boolean;
  hasAccount: boolean;
  emailVerified: boolean;
  tags: string[];
  lastLoginAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string | null;
  isDefault: boolean;
  fullName: string;
  phone: string;
  department: string;
  city: string;
  address1: string;
  address2: string | null;
  postalCode: string | null;
  documentType: string | null;
  documentNumber: string | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  total: number;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  internalNote: string | null;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
}

export interface CustomerFilters {
  q?: string;
  acceptsMarketing?: "" | "true" | "false";
  isActive?: "" | "true" | "false";
  tag?: string;
}

export interface CustomerPatch {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  tags?: string[];
  internalNote?: string | null;
  isActive?: boolean;
}

const KEY = ["customers"] as const;

function filterQuery(f: CustomerFilters): QueryParams {
  return { q: f.q, acceptsMarketing: f.acceptsMarketing, isActive: f.isActive, tag: f.tag };
}

export function useCustomers(filters: CustomerFilters, page: number, pageSize: number) {
  return usePaged<Customer>(KEY, "/admin/customers", { ...filterQuery(filters), page, pageSize });
}

export function useCustomer(id: string) {
  return useQuery<CustomerDetail, ApiError>({
    queryKey: [...KEY, "detail", id],
    queryFn: ({ signal }) => api.get<CustomerDetail>(`/admin/customers/${id}`, { signal }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation<Customer, ApiError, CustomerPatch>({
    mutationFn: (patch) => api.patch<Customer>(`/admin/customers/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEraseCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation<{ message: string }, ApiError, void>({
    mutationFn: () => api.post<{ message: string }>(`/admin/customers/${id}/erase`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Descarga el CSV de clientes con los filtros actuales (requiere customers:write). */
export async function exportCustomersCsv(filters: CustomerFilters): Promise<void> {
  const blob = await api.download("/admin/customers/export", { query: filterQuery(filters) });
  saveBlob(blob, "clientes.csv");
}

export type CustomerPage = Paged<Customer>;
