"use client";
/** Importador CSV contra /admin/import/jobs (multipart: `file`, `type`, `dryRun`). El trabajo corre en segundo plano: se sondea el progreso. */
import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import { useAction, useApi } from "../query";
import type { Page } from "../types";

export const MAX_IMPORT = 10 * 1024 * 1024;
export type ImportKind = "products" | "customers";
export type ImportStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export interface ImportRowError { row: number; code: string; message: string }
export interface ImportJob {
  id: string; type: ImportKind; status: ImportStatus; dryRun: boolean; fileName: string; totalRows: number; processedRows: number; progressPercent: number;
  createdCount: number; updatedCount: number; skippedCount: number; errorCount: number; startedAt: string | null; finishedAt: string | null; createdAt: string;
}
export interface ImportJobDetail extends ImportJob { errors: ImportRowError[]; errorsTruncated: boolean }
export const isActive = (j: Pick<ImportJob, "status">) => j.status === "queued" || j.status === "running";

export const useImports = (page: number) => {
  const q = useApi<Page<ImportJob>>(["imports"], "/admin/import/jobs", { query: { page, pageSize: 10 }, refetchInterval: 2000 });
  return q;
};
export const useImportDetail = (id: string | null, active: boolean) =>
  useQuery({ queryKey: ["import", id], enabled: !!id, queryFn: () => api.get<ImportJobDetail>(`/admin/import/jobs/${id}`), refetchInterval: active ? 2000 : false });
export const useStartImport = (onDone?: (j: ImportJob) => void) =>
  useAction(({ file, type, dryRun }: { file: File; type: ImportKind; dryRun: boolean }) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    fd.append("dryRun", String(dryRun));
    return api.upload<ImportJob>("/admin/import/jobs", fd);
  }, { invalidate: [["imports"]], success: "Importación en cola", onSuccess: onDone });
export const useCancelImport = () => useAction((id: string) => api.post<ImportJob>(`/admin/import/jobs/${id}/cancel`), { invalidate: [["imports"], ["import"]], success: "Importación cancelada" });
