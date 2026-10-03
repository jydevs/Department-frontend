"use client";
/** Biblioteca de medios contra /admin/media (subida multipart en el campo `file`, deduplicada por SHA-256 en el servidor). */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import { API_URL_PUBLIC } from "@/lib/api/config";
import { ApiError } from "../errors";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useAction } from "../query";

const voidOk = async (p: Promise<unknown>): Promise<void> => { try { await p; } catch (e) { if (!(e instanceof SyntaxError)) throw e; } };
import type { MediaItem, Page } from "../types";

export const MAX_UPLOAD = 8 * 1024 * 1024;
export const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

interface ApiMedia { id: string; url: string; alt: string | null; width: number | null; height: number | null; mimeType: string | null; byteSize: number | null; originalName: string | null; createdAt: string }
interface ApiUsage { type: "product" | "collection" | "content_document" | "content_version"; id: string; label: string }
const USAGE_KIND: Record<ApiUsage["type"], string> = { product: "Producto", collection: "Colección", content_document: "Contenido", content_version: "Contenido publicado" };
export const usageLabel = (u: ApiUsage): { kind: string; label: string } => ({ kind: u.type, label: `${USAGE_KIND[u.type]}: ${u.label}` });

/** Las URLs relativas (`/media/...`) apuntan al host de la API. */
export const mediaUrl = (u: string): string => (u.startsWith("/media/") ? `${API_URL_PUBLIC}${u}` : u);
const fromApi = (m: ApiMedia): MediaItem => ({
  id: m.id, url: mediaUrl(m.url), alt: m.alt ?? "", name: m.originalName ?? m.url.split("/").pop() ?? "archivo", size: m.byteSize ?? 0,
  type: m.mimeType ?? "", createdAt: m.createdAt, usages: [],
});

/** Primera página (100) de medios para selectores; `q` filtra por nombre o texto alternativo. */
export const useMedia = (q = "") =>
  useQuery({ queryKey: ["media", "picker", q], placeholderData: keepPreviousData, queryFn: async () => (await api.get<Page<ApiMedia>>("/admin/media", { query: { page: 1, pageSize: 100, q: q.trim() } })).items.map(fromApi) });
/** Listado paginado para la pantalla de medios. */
export const useMediaPage = (q: string, page: number, pageSize = 24) =>
  useQuery({ queryKey: ["media", "page", q, page], placeholderData: keepPreviousData, queryFn: async () => { const r = await api.get<Page<ApiMedia>>("/admin/media", { query: { page, pageSize, q: q.trim() } }); return { ...r, items: r.items.map(fromApi) }; } });
/** Mapa id → url (primeros 100 medios) para mostrar la imagen de una colección. */
export const useMediaMap = () => useQuery({ queryKey: ["media", "map"], staleTime: 60_000, queryFn: async () => new Map((await api.get<Page<ApiMedia>>("/admin/media", { query: { pageSize: 100 } })).items.map((m) => [m.id, mediaUrl(m.url)])) });
export const useMediaUsages = (id: string | null) =>
  useQuery({ queryKey: ["media-usages", id], enabled: !!id, queryFn: async () => (await api.get<ApiUsage[]>(`/admin/media/${id}/usages`)).map(usageLabel) });

/** Valida y sube un archivo. La API no informa progreso (fetch): se notifica 0 → 100. */
export async function uploadFile(file: File, onProgress: (p: number) => void): Promise<MediaItem> {
  if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: tipo no permitido (${file.type || "desconocido"})`);
  if (file.size > MAX_UPLOAD) throw new Error(`${file.name}: supera 8 MB`);
  onProgress(0);
  const fd = new FormData();
  fd.append("file", file);
  const m = await api.upload<ApiMedia>("/admin/media", fd);
  onProgress(100);
  return fromApi(m);
}
export const useUpdateMedia = () =>
  useAction(({ id, alt }: { id: string; alt: string }) => api.patch<ApiMedia>(`/admin/media/${id}`, { alt: alt.trim() || null }), { invalidate: [["media"]], success: "Texto alternativo guardado" });
/** Elimina; si está en uso (409 MEDIA_IN_USE) pide confirmación y reintenta con `force=true`. */
export const useDeleteMedia = () => {
  const confirm = useConfirm();
  return useAction(async (id: string) => {
    try { await voidOk(api.delete(`/admin/media/${id}`)); } catch (e) {
      if (!(e instanceof ApiError && e.code === "MEDIA_IN_USE")) throw e;
      const usages = (await api.get<ApiUsage[]>(`/admin/media/${id}/usages`).catch(() => [])).map((u) => usageLabel(u).label);
      if (!(await confirm({ title: "El archivo está en uso", message: `Se usa en: ${usages.slice(0, 8).join(", ") || "otros contenidos"}. Si lo eliminas, se quitará de productos y colecciones y quedará roto en el contenido publicado.`, danger: true, confirmLabel: "Eliminar de todos modos" }))) throw new Error("Eliminación cancelada");
      await voidOk(api.delete(`/admin/media/${id}`, undefined, { query: { force: true } }));
    }
  }, { invalidate: [["media"], ["media-usages"], ["product"], ["collection"]], success: "Archivo eliminado" });
};
