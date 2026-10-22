"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { API_ORIGIN, api } from "@/lib/admin/api-client";
import { ApiError } from "@/lib/admin/errors";

export interface MaintenanceTaskResult {
  task: string;
  affected: number;
  error?: string;
}

export interface MaintenanceSummary {
  executed: boolean;
  tasks: MaintenanceTaskResult[];
}

export interface SystemInfo {
  health: { status: string; uptimeSeconds: number } | null;
  ready: { status: string; database: string } | null;
  version: { name: string; version: string; gitSha: string | null; node: string } | null;
  /** Mensaje cuando alguno de los endpoints no respondió. */
  problems: string[];
}

/** /health, /ready y /version viven en la raíz de la API (sin /api/v1). */
async function getRoot<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}${path}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor" });
  }
  if (!res.ok) throw new ApiError({ status: res.status, code: res.status === 503 ? "SERVICE_UNAVAILABLE" : "ERROR", message: `${path} respondió ${res.status}` });
  return (await res.json()) as T;
}

export function useSystemInfo() {
  return useQuery<SystemInfo, ApiError>({
    queryKey: ["system-info"],
    staleTime: 0,
    queryFn: async () => {
      const [health, ready, version] = await Promise.allSettled([
        getRoot<SystemInfo["health"]>("/health"),
        getRoot<SystemInfo["ready"]>("/ready"),
        getRoot<SystemInfo["version"]>("/version"),
      ]);
      const problems: string[] = [];
      const pick = <T,>(r: PromiseSettledResult<T>, name: string): T | null => {
        if (r.status === "fulfilled") return r.value;
        problems.push(`${name}: ${r.reason instanceof Error ? r.reason.message : "error"}`);
        return null;
      };
      return { health: pick(health, "/health"), ready: pick(ready, "/ready"), version: pick(version, "/version"), problems };
    },
  });
}

export function useRunMaintenance() {
  return useMutation<MaintenanceSummary, ApiError, void>({
    mutationFn: () => api.post<MaintenanceSummary>("/admin/maintenance/run"),
  });
}

export const TASK_LABELS: Record<string, string> = {
  refresh_tokens: "Sesiones de personal caducadas",
  customer_refresh_tokens: "Sesiones de clientes caducadas",
  "email_outbox.purge": "Correos antiguos de la bandeja de salida",
  "email_outbox.blank_bodies": "Cuerpos de correos enviados (vaciados)",
  content_versions: "Versiones de contenido antiguas",
  import_jobs: "Importaciones antiguas",
  "orders.anonymize_closed": "Pedidos cerrados anonimizados",
};
