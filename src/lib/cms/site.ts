/** Datos globales de la tienda (cabecera, pie, buscador, carrito, newsletter), leídos una vez por petición. */
import { cache } from "react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { countAllProducts, getCollectionCount } from "@/lib/api/catalog";
import { getBundle, getMenu, getSettings, getTemplate, menuHref, previewToken } from "./content";
import { blocksOf, sectionOf, str, type CmsSection, type MenuItem, type Settings, type SiteSettings } from "./types";

export interface NavLink { label: string; href: string; /** colección "todo": muestra el contador de piezas */ isCatalog: boolean; children: { label: string; href: string }[] }
export interface Suggestion { label: string; url: string }

/** Serializable: viaja al navegador por `SiteProvider`. */
export interface SiteClientConfig {
  brandName: string;
  tagline: string;
  header: Settings;
  nav: NavLink[];
  announcement: { enabled: boolean; items: string[]; backgroundColor?: string; textColor?: string; duration: number };
  search: { settings: Settings; suggestions: Suggestion[] };
  cart: Settings;
  productCount: number;
}

/** Solo servidor: incluye lo que se pinta en el pie (server component). */
export interface SiteServerData {
  client: SiteClientConfig;
  settings: SiteSettings | null;
  footerSection?: CmsSection;
  newsletterSection?: CmsSection;
  footerMenu: NavLink[];
}

const toNav = (items: MenuItem[] | undefined): NavLink[] =>
  (items ?? []).map((i) => ({
    label: i.label,
    href: menuHref(i.link),
    isCatalog: i.link.type === "collection" && i.link.handle === "all",
    children: (i.children ?? []).map((c) => ({ label: c.label, href: menuHref(c.link) })),
  }));

/** Piezas del catálogo para el contador del menú: la colección "all" (misma petición cacheada que su página) o, si no existe, el listado. */
async function countProducts(): Promise<number> {
  return (await getCollectionCount("all")) ?? (await countAllProducts());
}

/**
 * Los fallos de la API se propagan (no hay "chrome vacío" cacheado por un fallo transitorio); solo un documento
 * inexistente (404) se sustituye por los valores por defecto.
 */
export const getSite = cache(async (): Promise<SiteServerData> => {
  // ajustes + menús + plantilla `layout` en una sola petición; en modo vista previa se lee cada documento (el token es de uno)
  const bundle = (await previewToken()) ? null : await getBundle("layout");
  const [settings, layout, search, cartTpl, count] = await Promise.all([
    bundle ? bundle.settings : getSettings(),
    bundle ? bundle.template : getTemplate("layout"),
    getTemplate("search"),
    getTemplate("cart"),
    countProducts(),
  ]);
  const header = sectionOf(layout?.sections, "site-header");
  const menuKey = str(header?.settings ?? {}, "menuKey", "main");
  const [main, footer] = await Promise.all([
    bundle && menuKey === "main" ? bundle.menus.main : getMenu(menuKey),
    bundle ? bundle.menus.footer : getMenu("footer"),
  ]);
  const searchSection = sectionOf(search?.sections, "search-panel");
  const ann = settings?.announcement;
  const items = ann?.items?.length ? ann.items : ann?.text ? [ann.text] : [];

  return {
    settings,
    footerSection: sectionOf(layout?.sections, "footer"),
    newsletterSection: sectionOf(layout?.sections, "newsletter"),
    footerMenu: toNav(footer?.items),
    client: {
      brandName: settings?.brand?.name ?? SITE_NAME,
      tagline: settings?.brand?.tagline ?? SITE_TAGLINE,
      header: header?.settings ?? {},
      nav: toNav(main?.items),
      announcement: { enabled: ann?.enabled ?? false, items, backgroundColor: ann?.backgroundColor, textColor: ann?.textColor, duration: ann?.duration ?? 38 },
      search: {
        settings: searchSection?.settings ?? {},
        suggestions: searchSection ? blocksOf(searchSection, "suggestion").map((b) => ({ label: str(b.settings, "label"), url: str(b.settings, "url", "/") })) : [],
      },
      cart: sectionOf(cartTpl?.sections, "cart-drawer")?.settings ?? {},
      productCount: count,
    },
  };
});
