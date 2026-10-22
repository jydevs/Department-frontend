"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import { usePaged } from "@/lib/admin/query";

export type ImportType = "products" | "customers";
export type ImportStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface ImportRowError {
  /** Línea del CSV (cabecera = 1); 0 = error de archivo. */
  row: number;
  code: string;
  message: string;
}

export interface ImportJob {
  id: string;
  type: ImportType;
  status: ImportStatus;
  dryRun: boolean;
  fileName: string;
  fileSha256: string;
  totalRows: number;
  processedRows: number;
  progressPercent: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ImportJobDetail extends ImportJob {
  errors: ImportRowError[];
  errorsTruncated: boolean;
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  queued: "En cola",
  running: "En curso",
  done: "Completado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export const IMPORT_STATUS_TONES: Record<ImportStatus, "neutral" | "info" | "success" | "danger"> = { queued: "neutral", running: "info", done: "success", failed: "danger", cancelled: "neutral" };

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  products: "Productos",
  customers: "Clientes",
};

export const isActiveJob = (s: ImportStatus) => s === "queued" || s === "running";

const KEY = ["imports"] as const;

export function useImportJobs(page: number, pageSize: number) {
  // mientras haya trabajos activos la lista se refresca sola
  const q = usePaged<ImportJob>(KEY, "/admin/import/jobs", { page, pageSize });
  return q;
}

export function useImportJob(id: string | null) {
  return useQuery<ImportJobDetail, ApiError>({
    queryKey: [...KEY, "detail", id],
    queryFn: ({ signal }) => api.get<ImportJobDetail>(`/admin/import/jobs/${id}`, { signal }),
    enabled: id !== null,
    staleTime: 0,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && isActiveJob(s) ? 2000 : false;
    },
  });
}

export function useCreateImport() {
  const qc = useQueryClient();
  return useMutation<ImportJob, ApiError, { file: File; type: ImportType; dryRun: boolean }>({
    mutationFn: ({ file, type, dryRun }) => {
      const form = new FormData();
      // los campos de texto van ANTES del archivo
      form.append("type", type);
      form.append("dryRun", String(dryRun));
      form.append("file", file);
      return api.upload<ImportJob>("/admin/import/jobs", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCancelImport() {
  const qc = useQueryClient();
  return useMutation<ImportJob, ApiError, string>({
    mutationFn: (id) => api.post<ImportJob>(`/admin/import/jobs/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/* ---------- plantillas CSV (cabeceras de Shopify) ---------- */

const PRODUCT_HEADERS = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
  "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy", "Variant Price",
  "Variant Compare At Price", "Variant Barcode", "Image Src", "Image Position", "Image Alt Text", "SEO Title", "SEO Description", "Status",
];
const PRODUCT_EXAMPLE = [
  "camiseta-ejemplo", "Camiseta de ejemplo", "<p>Descripción</p>", "Department", "Camisetas", "basicos, verano", "true", "Talla", "M", "", "",
  "CAM-EJ-M", "180", "shopify", "10", "deny", "59000", "79000", "", "https://example.com/camiseta.jpg", "1", "Camiseta frente", "Camiseta de ejemplo", "Camiseta de algodón", "active",
];
const CUSTOMER_HEADERS = [
  "Email", "First Name", "Last Name", "Phone", "Accepts Email Marketing", "Default Address Company", "Default Address Address1",
  "Default Address City", "Default Address Province", "Default Address Zip", "Default Address Phone",
];
const CUSTOMER_EXAMPLE = ["cliente@example.com", "Ana", "Gómez", "+573001234567", "no", "", "Calle 10 # 5-20", "Medellín", "Antioquia", "050001", "+573001234567"];

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV de plantilla (cabeceras Shopify + una fila de ejemplo), generado en el cliente. */
export function templateCsv(type: ImportType): string {
  const headers = type === "products" ? PRODUCT_HEADERS : CUSTOMER_HEADERS;
  const example = type === "products" ? PRODUCT_EXAMPLE : CUSTOMER_EXAMPLE;
  return `${headers.map(csvCell).join(",")}\r\n${example.map(csvCell).join(",")}\r\n`;
}

/** Descripción en español de los códigos de error por fila (el mensaje original del servidor se conserva como detalle). */
export const ROW_ERROR_LABELS: Record<string, string> = {
  DUPLICATE_IN_FILE: "Repetido en el archivo",
  DUPLICATE_SKU: "SKU repetido",
  DUPLICATE_VARIANT: "Variante repetida",
  SKU_TAKEN: "SKU ya en uso",
  INVALID_EMAIL: "Correo no válido",
  INVALID_NAME: "Nombre no válido",
  INVALID_PHONE: "Teléfono no válido",
  INVALID_HANDLE: "Handle no válido",
  MISSING_HANDLE: "Falta el handle",
  TITLE_REQUIRED: "Falta el título",
  INVALID_TITLE: "Título no válido",
  INVALID_PRICE: "Precio no válido",
  INVALID_NUMBER: "Número no válido",
  INVALID_SKU: "SKU no válido",
  INVALID_STATUS: "Estado no válido",
  INVALID_POLICY: "Política de inventario no válida",
  INVALID_PUBLISHED: "Valor de «Published» no válido",
  INVALID_TAGS: "Etiquetas no válidas",
  INVALID_URL: "URL no válida",
  INVALID_OPTIONS: "Opciones no válidas",
  MISSING_OPTION_VALUE: "Falta el valor de una opción",
  OPTIONS_MISMATCH: "Las opciones no coinciden",
  FIELD_TOO_LONG: "Campo demasiado largo",
  BODY_TOO_LONG: "Descripción demasiado larga",
  TOO_MANY_IMAGES: "Demasiadas imágenes",
  TOO_MANY_VARIANTS: "Demasiadas variantes",
  NO_VARIANT: "Sin variantes",
  NO_DEFAULT_LOCATION: "No hay ubicación de inventario por defecto",
  INVENTORY_ERROR: "Error de inventario",
  STOCK_BELOW_RESERVED: "Stock inferior al reservado",
  HANDLE_DELETED: "Handle de un producto eliminado",
  NOT_PUBLISHABLE: "No se puede publicar",
  SUPPRESSED: "Cliente con supresión de datos",
  CUSTOMER_UNAVAILABLE: "Cliente no disponible",
  ACCOUNT_UNVERIFIED_SKIPPED: "Cuenta sin verificar: omitido",
  CONFLICT: "Conflicto con datos existentes",
  NOT_FOUND: "No encontrado",
  INTERNAL_ERROR: "Error inesperado",
  WORKER_INTERRUPTED: "Importación interrumpida",
};
