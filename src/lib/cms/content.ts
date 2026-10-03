/**
 * Lectura del contenido publicado (o del borrador en modo vista previa) desde el CMS del backend.
 * Cada documento se cachea con la etiqueta `content:<kind>:<key>` (la misma que envía el backend en
 * `POST /api/revalidate`), de modo que publicar en el panel actualiza la tienda en segundos.
 */
import { cookies, draftMode } from "next/headers";
import { APP_ENV } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { sfGet } from "@/lib/api/server";
import type { ApiContentDoc, ApiPageListItem, ApiRedirect } from "@/lib/api/types";
import type { MenuData, PageData, SiteSettings, TemplateData } from "./types";

export const PREVIEW_COOKIE = "dept_preview";
/** Respaldo por tiempo si el webhook de revalidación no llega (la etiqueta lo invalida antes). */
const REVALIDATE = Number(process.env.CONTENT_REVALIDATE_SECONDS ?? (APP_ENV === "qa" ? 10 : 300));

async function previewToken(): Promise<string | undefined> {
  try {
    const dm = await draftMode();
    if (!dm.isEnabled) return undefined;
    return (await cookies()).get(PREVIEW_COOKIE)?.value;
  } catch {
    return undefined; // fuera de una petición (build): sin vista previa
  }
}

async function getDoc<T>(path: string, tag: string): Promise<T | null> {
  const preview = await previewToken();
  if (preview) {
    try {
      const doc = await sfGet<ApiContentDoc<T>>(path, { preview, allow404: true });
      if (doc) return doc.data;
    } catch (e) {
      // el token solo vale para UN documento: cualquier otro se lee publicado
      if (!(e instanceof ApiError) || ![400, 401, 403, 404].includes(e.status)) throw e;
    }
  }
  const doc = await sfGet<ApiContentDoc<T>>(path, { tags: ["content", tag], revalidate: REVALIDATE, allow404: true });
  return doc?.data ?? null;
}

export const getSettings = () => getDoc<SiteSettings>("/storefront/content/settings", "content:settings:site");
export const getMenu = (key: string) => getDoc<MenuData>(`/storefront/content/menus/${encodeURIComponent(key)}`, `content:menu:${key}`);
export const getTemplate = (key: string) => getDoc<TemplateData>(`/storefront/content/templates/${encodeURIComponent(key)}`, `content:template:${key}`);
export const getPage = (key: string) => getDoc<PageData>(`/storefront/content/pages/${encodeURIComponent(key)}`, `content:page:${key}`);

export async function getPageList(): Promise<ApiPageListItem[]> {
  return (await sfGet<ApiPageListItem[]>("/storefront/content/pages", { tags: ["content", "content:pages"], revalidate: REVALIDATE })) ?? [];
}

export async function getRedirects(): Promise<ApiRedirect[]> {
  try {
    return (await sfGet<ApiRedirect[]>("/storefront/redirects", { tags: ["content", "content:redirects"], revalidate: REVALIDATE })) ?? [];
  } catch {
    return [];
  }
}

/** Resuelve un enlace de menú del CMS a una ruta de la tienda. */
export function menuHref(link: { type: string; handle?: string; url?: string }): string {
  if (link.type === "collection") return `/collections/${link.handle}`;
  if (link.type === "product") return `/products/${link.handle}`;
  if (link.type === "page") return `/pages/${link.handle}`;
  return link.url ?? "/";
}
