import { cache } from "react";
import { getMenu, getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import type { SectionEnvelope, SiteSettings, TemplateData } from "@/lib/api/types";
import { getCollectionCount, getPopularProducts } from "@/lib/catalog/service";
import type { Product } from "@/lib/catalog/types";
import type { HeaderConfig } from "@/components/layout/Header";
import type { FooterColumn, FooterConfig, FooterLink } from "@/components/layout/SiteFooter";
import type { CartConfig } from "@/components/layout/config";
import type { SearchConfig } from "@/components/search/config";
import { readCartConfig, readNewsletter, readSearchConfig } from "./adapters";
import { flattenNav, toNav, type NavItem } from "./links";
import { blocksOf, isHexColor, isSafeLink, reader } from "./reader";
import { fallbackLayoutTemplate, FALLBACK_MENUS } from "./fallback";
import { DEFAULT_NEWSLETTER } from "@/components/layout/config";
import { resolveMediaUrl } from "@/lib/api/media";

/** Everything the root layout needs, resolved once per request from the CMS (and gracefully defaulted). */
export interface LayoutData {
  settings: SiteSettings;
  header: HeaderConfig;
  footer: FooterConfig;
  searchConfig: SearchConfig;
  cartConfig: CartConfig;
  popularProducts: Product[];
  /** false when the header section hides the ticker or the announcement is disabled */
  announcementVisible: boolean;
  skipLinkLabel: string;
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  pinterest: "Pinterest",
  x: "X",
};

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function findSection(template: TemplateData | null, type: string): SectionEnvelope | undefined {
  return template?.sections.find((s) => s.type === type && s.enabled !== false);
}

function buildHeader(
  section: SectionEnvelope | undefined,
  settings: SiteSettings,
  nav: NavItem[],
  productCount: number | null,
): { header: HeaderConfig; announcementVisible: boolean } {
  const r = reader(section ?? { settings: {} });
  const a = settings.announcement;
  const items = a.items && a.items.length > 0 ? a.items : a.text ? [a.text] : [];
  const showAnnouncement = r.bool("showAnnouncement", true) && a.enabled && items.length > 0;
  const showProductCount = r.bool("showProductCount", true);

  const header: HeaderConfig = {
    brandName: settings.brand.name,
    logoUrl: resolveMediaUrl(settings.brand.logoMediaUrl) ?? undefined,
    logoVariant: r.oneOf("logoVariant", ["red", "black"], "red"),
    nav,
    mobileLinks: flattenNav(nav).map((n) => ({ id: n.id, label: n.label, href: n.href })),
    productCount: showProductCount ? productCount : null,
    announcement: showAnnouncement
      ? {
          items,
          href: a.href && isSafeLink(a.href) ? a.href : undefined,
          backgroundColor: isHexColor(a.backgroundColor) ? a.backgroundColor : undefined,
          textColor: isHexColor(a.textColor) ? a.textColor : undefined,
          separator: a.separator || "✦",
          duration: a.duration ?? 38,
        }
      : null,
    showSearch: r.bool("showSearch", true),
    showAccount: r.bool("showAccount", true),
    showCart: r.bool("showCart", true),
    transparentOnHero: r.bool("transparentOnHero", true),
    homeAriaLabel: r.str("homeAriaLabel", `${settings.brand.name} — inicio`),
    searchLabel: r.str("searchLabel", "Buscar"),
    accountLabel: r.str("accountLabel", "Cuenta"),
    cartLabel: r.str("cartLabel", "Carrito"),
    menuOpenLabel: r.str("menuOpenLabel", "Abrir menú"),
    menuCloseLabel: r.str("menuCloseLabel", "Cerrar menú"),
    navLabel: r.str("navLabel", "Principal"),
    mobileMenuLabel: r.str("mobileMenuLabel", "Menú"),
    mobileMenuTagline: r.str("mobileMenuTagline", settings.brand.tagline ?? ""),
  };
  return { header, announcementVisible: showAnnouncement };
}

function footerLinksFromBlock(links: unknown): FooterLink[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((l): FooterLink[] => {
    if (typeof l !== "object" || l === null) return [];
    const { label, url } = l as { label?: unknown; url?: unknown };
    return typeof label === "string" && typeof url === "string" && isSafeLink(url) ? [{ label, href: url }] : [];
  });
}

function buildFooter(
  section: SectionEnvelope | undefined,
  newsletterSection: SectionEnvelope | undefined,
  settings: SiteSettings,
  menus: Record<string, NavItem[]>,
): FooterConfig {
  // legacy flag `footer.showNewsletter`: a footer asking for the newsletter gets one even without a `newsletter` section
  const legacyNewsletter = section ? reader(section).bool("showNewsletter", false) : false;
  const newsletter = newsletterSection
    ? readNewsletter(newsletterSection)
    : legacyNewsletter
      ? DEFAULT_NEWSLETTER
      : null;
  const social: FooterLink[] = Object.entries(settings.social)
    .flatMap(([key, url]) => (typeof url === "string" && url.startsWith("https://") ? [{ label: SOCIAL_LABELS[key] ?? key, href: url }] : []));
  // settings/site.store.whatsapp (digits, optional +) → wa.me link
  const whatsapp = settings.store.whatsapp?.replace(/^\+/, "");
  if (whatsapp && /^[0-9]{7,15}$/.test(whatsapp)) social.push({ label: "WhatsApp", href: `https://wa.me/${whatsapp}` });

  if (!section) {
    // no footer section published: keep a small brand footer
    return {
      brandTitle: settings.brand.tagline,
      brandText: settings.brand.description,
      columns: [],
      social,
      showSocial: true,
      wordmark: settings.brand.name,
      copyright: `© ${new Date().getFullYear()} ${settings.brand.name}`,
      newsletter,
    };
  }

  const r = reader(section);
  const columns: FooterColumn[] = [];
  for (const b of blocksOf(section)) {
    if (b.type === "column") {
      const menuKey = b.s.opt("menuKey");
      const fromMenu = menuKey ? (menus[menuKey] ?? []).map((n) => ({ label: n.label, href: n.href })) : null;
      const links = fromMenu && fromMenu.length > 0 ? fromMenu : footerLinksFromBlock(b.s.raw("links"));
      columns.push({ kind: "links", id: b.id, title: b.s.str("title"), links });
    } else if (b.type === "account-links") {
      columns.push({
        kind: "account",
        id: b.id,
        title: b.s.str("title", "Cuenta"),
        accountLabel: b.s.str("accountLabel", "Mi cuenta"),
        cartLabel: b.s.str("cartLabel", "Carrito"),
      });
    }
  }

  return {
    brandTitle: r.opt("brandTitle"),
    brandText: r.opt("brandText"),
    columns,
    social,
    showSocial: r.bool("showSocial", true),
    wordmark: r.bool("showWordmark", true) ? (r.opt("wordmark") ?? settings.brand.name) : undefined,
    copyright: r.opt("copyright"),
    bottomText: r.opt("bottomText"),
    backToTopLabel: r.opt("backToTopLabel"),
    backgroundColor: r.color("backgroundColor"),
    newsletter,
  };
}

/** Loads (and memoises per request) everything the shared chrome needs. Never throws. */
export const loadLayout = cache(async (): Promise<LayoutData> => {
  const [settings, fetchedLayout, searchTemplate, cartTemplate] = await Promise.all([
    getSiteSettingsOrDefault(),
    safe(getTemplate("layout"), null),
    safe(getTemplate("search"), null),
    safe(getTemplate("cart"), null),
  ]);
  // no layout document (API down / not seeded yet): the original header, newsletter and footer
  const layoutTemplate = fetchedLayout ?? fallbackLayoutTemplate(settings.brand.name);

  const headerSection = findSection(layoutTemplate, "site-header");
  const footerSection = findSection(layoutTemplate, "footer");
  const newsletterSection = findSection(layoutTemplate, "newsletter");

  // menus referenced by the header and by footer columns
  const menuKeys = new Set<string>([reader(headerSection ?? { settings: {} }).str("menuKey", "main")]);
  for (const block of footerSection?.blocks ?? []) {
    const key = block.settings?.menuKey;
    if (typeof key === "string" && /^[a-z0-9-]{1,60}$/.test(key)) menuKeys.add(key);
  }
  const menuEntries = await Promise.all(
    [...menuKeys].map(async (key) => [key, toNav((await safe(getMenu(key), null)) ?? FALLBACK_MENUS[key] ?? null)] as const),
  );
  const menus: Record<string, NavItem[]> = Object.fromEntries(menuEntries);

  const mainKey = reader(headerSection ?? { settings: {} }).str("menuKey", "main");
  const nav = menus[mainKey] ?? [];
  const searchSection = findSection(searchTemplate, "search-panel");
  const searchConfig = readSearchConfig(searchSection);
  const cartConfig = readCartConfig(findSection(cartTemplate, "cart-drawer"));

  const wantsCount = nav.some((n) => n.collectionHandle === "all");
  const [productCount, popularProducts] = await Promise.all([
    wantsCount ? getCollectionCount("all") : Promise.resolve(0),
    getPopularProducts(searchConfig.popularLimit),
  ]);

  const { header, announcementVisible } = buildHeader(headerSection, settings, nav, wantsCount && productCount > 0 ? productCount : null);
  const footer = buildFooter(footerSection, newsletterSection, settings, menus);

  const skipLinkLabel = reader(headerSection ?? { settings: {} }).str("skipLinkLabel", "Saltar al contenido");
  return { settings, header, footer, searchConfig, cartConfig, popularProducts, announcementVisible, skipLinkLabel };
});
