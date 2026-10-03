"use client";
/** Biblioteca de medios contra /admin/media (subida multipart en el campo `file`, deduplicada por SHA-256 en el servidor). */
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import { API_URL_PUBLIC } from "@/lib/api/config";
import { ApiError } from "../errors";
import { useConfirm } from "@/components/admin/ui/Overlay";
import { useAction } from "../query";
import type { MediaItem, Page } from "../types";

const voidOk = async (p: Promise<unknown>): Promise<void> => { try { await p; } catch (e) { if (!(e instanceof SyntaxError)) throw e; } };

export const MAX_UPLOAD = 8 * 1024 * 1024;
export const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

interface ApiMedia { id: string; url: string; alt: string | null; width: number | null; height: number | null; mimeType: string | null; byteSize: number | null; originalName: string | null; createdAt: string }
interface ApiUsage { type: "product" | "collection" | "content_document" | "content_version"; id: string; label: string }
const USAGE_KIND: Record<ApiUsage["type"], string> = { product: "Producto", collection: "Colección", content_document: "Contenido", content_version: "Contenido publicado" };
export const usageLabel = (u: ApiUsage): { kind: string; label: string } => ({ kind: u.type, label: `${USAGE_KIND[u.type]}: ${u.label}` });

/** Las URLs relativas (`/media/...`) apuntan al host de la API. */
export const mediaUrl = (u: string): string => (u.startsWith("/media/") ? `${API_URL_PUBLIC}${u}` : u);
/** Inversa de `mediaUrl`: una URL absoluta del origen de la API (`http://localhost:4000/media/x`) se guarda como ruta `/media/x`, que el backend acepta en cualquier campo (la absoluta http:// la rechaza el CMS) y no duplica el medio. */
export const storedMediaUrl = (u: string): string => (u.startsWith(`${API_URL_PUBLIC}/media/`) ? u.slice(API_URL_PUBLIC.length) : u);
const fromApi = (m: ApiMedia): MediaItem => ({
  id: m.id, url: mediaUrl(m.url), alt: m.alt ?? "", name: m.originalName ?? m.url.split("/").pop() ?? "archivo", size: m.byteSize ?? 0,
  type: m.mimeType ?? "", createdAt: m.createdAt, usages: [],
});

const PICKER_PAGE = 48;
/** Biblioteca para selectores, paginada ("Cargar más"): devuelve lo cargado y el total; `q` filtra EN EL SERVIDOR por nombre o texto alternativo. */
export const useMedia = (q = "") =>
  useInfiniteQuery({
    queryKey: ["media", "picker", q.trim()], initialPageParam: 1, placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => api.get<Page<ApiMedia>>("/admin/media", { query: { page: pageParam, pageSize: PICKER_PAGE, q: q.trim() } }),
    getNextPageParam: (l) => (l.page < l.totalPages ? l.page + 1 : undefined),
    select: (d) => ({ items: d.pages.flatMap((p) => p.items.map(fromApi)), total: d.pages[0]?.total ?? 0 }),
  });
/** Listado paginado para la pantalla de medios. */
export const useMediaPage = (q: string, page: number, pageSize = 24) =>
  useQuery({ queryKey: ["media", "page", q, page], placeholderData: keepPreviousData, queryFn: async () => { const r = await api.get<Page<ApiMedia>>("/admin/media", { query: { page, pageSize, q: q.trim() } }); return { ...r, items: r.items.map(fromApi) }; } });
/** Mapa id → url de los medios pedidos: recorre la biblioteca página a página hasta encontrarlos todos (la API no tiene "medio por id"). */
export const useMediaUrls = (ids: (string | null | undefined)[]) => {
  const want = [...new Set(ids.filter((x): x is string => !!x))].sort();
  return useQuery({
    queryKey: ["media", "urls", want], enabled: want.length > 0, staleTime: 60_000, placeholderData: keepPreviousData,
    queryFn: async () => {
      const found = new Map<string, string>();
      for (let page = 1; page <= 100 && found.size < want.length; page++) {
        const r = await api.get<Page<ApiMedia>>("/admin/media", { query: { page, pageSize: 100 } });
        for (const m of r.items) if (want.includes(m.id)) found.set(m.id, mediaUrl(m.url));
        if (page >= r.totalPages) break;
      }
      return found;
    },
  });
};
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
