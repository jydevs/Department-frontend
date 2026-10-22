"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { API_BASE, API_ORIGIN, api, getAccessToken, refreshSession } from "@/lib/admin/api-client";
import { ApiError } from "@/lib/admin/errors";
import type { Paged } from "@/lib/admin/query";
import { STOREFRONT_URL, safeHref } from "@/lib/admin/utils";

export interface MediaItem {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  byteSize: number | null;
  originalName: string | null;
  sha256: string | null;
  createdAt: string;
}

export interface MediaUsage {
  type: "product" | "collection" | "content_document" | "content_version";
  id: string;
  label: string;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"] as const;
export const ALLOWED_ACCEPT = ALLOWED_MIME.join(",");

/** Valida un archivo antes de subirlo; devuelve el mensaje de error o null si es válido. */
export function validateUpload(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return "Tipo no admitido: usa PNG, JPEG, WebP, AVIF o GIF.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Supera el límite de 8 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

/**
 * URL mostrable de una imagen guardada en el CMS. Las rutas `/media/…` las sirve la API; el resto de rutas
 * relativas (`/images/…`) viven en la tienda. Devuelve null si la URL no es segura.
 */
export function resolveMediaSrc(url: string | null | undefined): string | null {
  const safe = safeHref(url);
  if (!safe) return null;
  if (safe.startsWith("/")) return safe.startsWith("/media/") ? `${API_ORIGIN}${safe}` : `${STOREFRONT_URL}${safe}`;
  if (safe.startsWith("mailto:") || safe.startsWith("tel:")) return null;
  return safe;
}

export function useMediaList(params: { page: number; pageSize: number; q: string }, enabled = true): UseQueryResult<Paged<MediaItem>, ApiError> {
  return useQuery<Paged<MediaItem>, ApiError>({
    queryKey: ["media", "list", params],
    queryFn: ({ signal }) => api.get<Paged<MediaItem>>("/admin/media", { query: { page: params.page, pageSize: params.pageSize, q: params.q || undefined }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMediaUsages(id: string | null): UseQueryResult<MediaUsage[], ApiError> {
  return useQuery<MediaUsage[], ApiError>({
    queryKey: ["media", "usages", id],
    queryFn: ({ signal }) => api.get<MediaUsage[]>(`/admin/media/${id}/usages`, { signal }),
    enabled: !!id,
  });
}

export function useUpdateMediaAlt() {
  const qc = useQueryClient();
  return useMutation<MediaItem, ApiError, { id: string; alt: string | null }>({
    mutationFn: ({ id, alt }) => api.patch<MediaItem>(`/admin/media/${id}`, { alt }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["media"] }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { id: string; force?: boolean }>({
    mutationFn: ({ id, force }) => api.delete<void>(`/admin/media/${id}`, undefined, { query: force ? { force: "true" } : undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["media"] }),
  });
}

/** Usos incluidos en un error 409 MEDIA_IN_USE. */
export function usagesFromError(e: unknown): MediaUsage[] {
  if (e instanceof ApiError && e.code === "MEDIA_IN_USE" && typeof e.details === "object" && e.details !== null) {
    const u = (e.details as { usages?: unknown }).usages;
    if (Array.isArray(u)) return u as MediaUsage[];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Subida con progreso (XMLHttpRequest: fetch no expone el progreso)    */
/* ------------------------------------------------------------------ */

function xhrUpload(file: File, token: string | null, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/admin/media`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor" }));
    xhr.onabort = () => reject(new DOMException("Cancelado", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** Sube un archivo a /admin/media. Reintenta una vez tras renovar la sesión si recibe 401. */
export async function uploadMedia(file: File, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<{ media: MediaItem; created: boolean }> {
  let res = await xhrUpload(file, getAccessToken(), onProgress, signal);
  if (res.status === 401) {
    const fresh = await refreshSession();
    if (fresh) res = await xhrUpload(file, fresh, onProgress, signal);
  }
  if (res.status >= 200 && res.status < 300) return { media: res.body as MediaItem, created: res.status === 201 };
  const b = (res.body ?? {}) as { code?: string; message?: string; details?: unknown; requestId?: string };
  throw new ApiError({
    status: res.status,
    code: b.code ?? (res.status === 413 ? "PAYLOAD_TOO_LARGE" : res.status === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "ERROR"),
    message: b.message ?? "No se pudo subir el archivo",
    details: b.details,
    requestId: b.requestId,
  });
}
