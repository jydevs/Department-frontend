"use client";
import { db, nid, now, sleep } from "../mock/db";
import { useAction, useMock } from "../query";
import type { MediaItem } from "../types";

export const MAX_UPLOAD = 8 * 1024 * 1024;
export const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const useMedia = (q = "") => useMock(["media", q], () => db().media.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase())));
export const useMediaUsages = (id: string | null) => useMock(["media-usages", id], () => db().media.find((m) => m.id === id)?.usages ?? [], !!id);

/** Valida y "sube" (simulado) un archivo; devuelve el progreso por callback. */
export async function uploadFile(file: File, onProgress: (p: number) => void): Promise<MediaItem> {
  if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: tipo no permitido (${file.type || "desconocido"})`);
  if (file.size > MAX_UPLOAD) throw new Error(`${file.name}: supera 8 MB`);
  for (let p = 0; p <= 100; p += 20) { onProgress(p); await sleep(120); }
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("No se pudo leer el archivo")); r.readAsDataURL(file); });
  const item: MediaItem = { id: nid("med"), url, alt: "", name: file.name, size: file.size, type: file.type, createdAt: now(), usages: [] };
  db().media.unshift(item);
  return item;
}
export const useUpdateMedia = () => useAction(({ id, alt }: { id: string; alt: string }) => { const m = db().media.find((x) => x.id === id); if (m) m.alt = alt; }, { invalidate: [["media"]], success: "Texto alternativo guardado" });
export const useDeleteMedia = () => useAction((id: string) => { const d = db(); d.media = d.media.filter((m) => m.id !== id); }, { invalidate: [["media"]], success: "Archivo eliminado" });
