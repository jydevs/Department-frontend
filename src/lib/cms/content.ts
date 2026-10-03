/**
 * Lectura del contenido publicado (o del borrador en modo vista previa) desde el CMS del backend.
 * Cada documento se cachea con la etiqueta `content:<kind>:<key>` (la misma que envía el backend en
 * `POST /api/revalidate`), de modo que publicar en el panel actualiza la tienda en segundos.
 *
 * Un documento que no existe (404) devuelve `null` y la tienda usa su contenido por defecto; un fallo de la API
 * (red, 5xx) se lanza: nunca se cachea una página degradada (ver `lib/api/server.ts`).
 */
import { cache } from "react";
import { cookies, draftMode } from "next/headers";
import { APP_ENV } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { sfGet } from "@/lib/api/server";
import type { ApiContentDoc, ApiPageListItem } from "@/lib/api/types";
import { safeLinkHref } from "./href";
import type { MenuData, PageData, SiteSettings, TemplateData } from "./types";

export const PREVIEW_COOKIE = "dept_preview";
/** Respaldo por tiempo si el webhook de revalidación no llega (la etiqueta lo invalida antes). */
const REVALIDATE = Number(process.env.CONTENT_REVALIDATE_SECONDS ?? (APP_ENV === "qa" ? 10 : 300));

/** Token de vista previa (modo borrador) de la petición actual, si lo hay. */
export async function previewToken(): Promise<string | undefined> {
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

export const getSettings = cache(() => getDoc<SiteSettings>("/storefront/content/settings", "content:settings:site"));
export const getMenu = cache((key: string) => getDoc<MenuData>(`/storefront/content/menus/${encodeURIComponent(key)}`, `content:menu:${key}`));
export const getTemplate = cache((key: string) => getDoc<TemplateData>(`/storefront/content/templates/${encodeURIComponent(key)}`, `content:template:${key}`));
export const getPage = cache((key: string) => getDoc<PageData>(`/storefront/content/pages/${encodeURIComponent(key)}`, `content:page:${key}`));

export interface ContentBundle {
  settings: SiteSettings | null;
  menus: { main: MenuData | null; footer: MenuData | null };
  template: TemplateData | null;
}

/** Ajustes + menús `main`/`footer` + una plantilla en UNA petición (`/storefront/content/bundle`); no admite vista previa. */
export const getBundle = cache(async (template: string): Promise<ContentBundle> => {
  const b = await sfGet<{ settings: ApiContentDoc<SiteSettings> | null; menus: { main: ApiContentDoc<MenuData> | null; footer: ApiContentDoc<MenuData> | null }; template: ApiContentDoc<TemplateData> | null }>(
    "/storefront/content/bundle",
    { query: { template }, tags: ["content", "content:settings:site", "content:menu:main", "content:menu:footer", `content:template:${template}`], revalidate: REVALIDATE },
  );
  return { settings: b?.settings?.data ?? null, menus: { main: b?.menus.main?.data ?? null, footer: b?.menus.footer?.data ?? null }, template: b?.template?.data ?? null };
});

export async function getPageList(opts: { bail?: boolean } = {}): Promise<ApiPageListItem[]> {
  return (await sfGet<ApiPageListItem[]>("/storefront/content/pages", { tags: ["content", "content:pages"], revalidate: REVALIDATE, bail: opts.bail })) ?? [];
}

/** Resuelve un enlace de menú del CMS a una ruta de la tienda o a un enlace seguro (https, mailto, tel); lo inseguro → "/". */
export function menuHref(link: { type: string; handle?: string; url?: string }): string {
  const h = link.handle ? encodeURIComponent(link.handle) : "";
  if (link.type === "collection") return h ? `/collections/${h}` : "/";
  if (link.type === "product") return h ? `/products/${h}` : "/";
  if (link.type === "page") return h ? `/pages/${h}` : "/";
  return safeLinkHref(link.url);
}
