"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged } from "@/lib/admin/query";

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleId: string;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedStaff extends StaffMember {
  /** Contraseña temporal: el servidor la devuelve una sola vez. */
  password: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

const KEY = ["staff"] as const;

export function useStaff(page: number, pageSize: number, enabled = true) {
  return usePaged<StaffMember>(KEY, "/admin/staff", { page, pageSize }, { enabled });
}

export function useRoles(enabled: boolean) {
  return useQuery<Role[], ApiError>({
    queryKey: ["roles"],
    queryFn: ({ signal }) => api.get<Role[]>("/admin/roles", { signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation<CreatedStaff, ApiError, { email: string; fullName: string; roleId: string }>({
    mutationFn: (body) => api.post<CreatedStaff>("/admin/staff", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation<StaffMember, ApiError, { id: string; patch: { fullName?: string; roleId?: string; isActive?: boolean } }>({
    mutationFn: ({ id, patch }) => api.patch<StaffMember>(`/admin/staff/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateStaff() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
