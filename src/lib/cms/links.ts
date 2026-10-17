import type { MenuData, MenuItem, MenuLink } from "@/lib/api/types";
import { isSafeLink } from "./reader";

/** Resolves a CMS menu link to an internal route / safe external URL. Null when it cannot be resolved. */
export function resolveMenuLink(link: MenuLink | undefined): string | null {
  if (!link) return null;
  switch (link.type) {
    case "collection":
      return `/collections/${encodeURIComponent(link.handle)}`;
    case "product":
      return `/products/${encodeURIComponent(link.handle)}`;
    case "page":
      return `/pages/${encodeURIComponent(link.handle)}`;
    case "url":
      return typeof link.url === "string" && isSafeLink(link.url) ? link.url : null;
    default:
      return null;
  }
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  /** collection handle when the link points to one (drives the product-count superscript) */
  collectionHandle?: string;
  /** route prefixes that mark this item as the current section */
  matchPrefixes: string[];
  children: NavItem[];
}

function toNavItem(item: MenuItem, depth: number): NavItem | null {
  const href = resolveMenuLink(item.link);
  if (!href || typeof item.label !== "string" || item.label.length === 0) return null;
  const isCollection = item.link.type === "collection";
  const children =
    depth < 3 && Array.isArray(item.children)
      ? item.children.flatMap((c) => {
          const child = toNavItem(c, depth + 1);
          return child ? [child] : [];
        })
      : [];
  return {
    id: item.id,
    label: item.label,
    href,
    collectionHandle: isCollection && item.link.type === "collection" ? item.link.handle : undefined,
    // the catch-all collection stands for the whole shop: product pages belong to it too
    matchPrefixes:
      isCollection && item.link.type === "collection" && item.link.handle === "all" ? ["/collections", "/products"] : [],
    children,
  };
}

/** Menu document → resolved navigation tree (unresolvable items are dropped). */
export function toNav(menu: MenuData | null | undefined): NavItem[] {
  if (!menu || !Array.isArray(menu.items)) return [];
  return menu.items.flatMap((item) => {
    const nav = toNavItem(item, 1);
    return nav ? [nav] : [];
  });
}

/** Parent followed by its children, as the full-screen mobile menu lists them. */
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...flattenNav(item.children)]);
}
