"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";

export interface RedirectItem {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RedirectInput {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  isActive: boolean;
}

export function useCreateRedirect() {
  const qc = useQueryClient();
  return useMutation<RedirectItem, ApiError, RedirectInput>({
    mutationFn: (input) => api.post<RedirectItem>("/admin/redirects", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["redirects"] }),
  });
}

export function useUpdateRedirect() {
  const qc = useQueryClient();
  return useMutation<RedirectItem, ApiError, { id: string; patch: Partial<RedirectInput> }>({
    mutationFn: ({ id, patch }) => api.patch<RedirectItem>(`/admin/redirects/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["redirects"] }),
  });
}

export function useDeleteRedirect() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/admin/redirects/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["redirects"] }),
  });
}

/** Normalización cliente equivalente a la del servidor (solo para vista previa y validación rápida). */
export function validateFromPath(v: string): string | null {
  const t = v.trim();
  if (!t) return "Obligatorio";
  if (!t.startsWith("/") || t.startsWith("//")) return "Debe empezar por una sola barra (/)";
  if (t.includes("\\") || /\s/.test(t)) return "No se permiten espacios ni barras invertidas";
  return null;
}

export function validateToPath(v: string): string | null {
  const t = v.trim();
  if (!t) return "Obligatorio";
  if (/\s/.test(t) || t.includes("\\")) return "No se permiten espacios ni barras invertidas";
  if (t.startsWith("/")) return t.startsWith("//") ? "Usa una sola barra inicial" : null;
  if (t.startsWith("https://")) {
    try {
      return new URL(t).protocol === "https:" ? null : "URL inválida";
    } catch {
      return "URL inválida";
    }
  }
  return "Usa una ruta (/ruta) o una URL https://";
}
