import {
  Boxes,
  FileText,
  Home,
  Image as ImageIcon,
  LayoutTemplate,
  Mail,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  Palette,
  Percent,
  ShoppingBag,
  ShieldCheck,
  Shapes,
  Truck,
  Upload,
  UserCircle,
  Users,
  Waypoints,
  ScrollText,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permisos de lectura requeridos (todos). Vacío = visible para cualquier personal. */
  perms: string[];
  /** "exact": solo activa en la ruta exacta (p. ej. Inicio, Resumen). */
  exact?: boolean;
  /** Prefijos extra que también resaltan este ítem. */
  alsoActiveOn?: string[];
}

export interface NavGroup {
  /** Sin título = grupo superior sin cabecera. */
  title?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Inicio", href: "/", icon: Home, perms: [], exact: true },
      { label: "Pedidos", href: "/orders", icon: ShoppingBag, perms: ["orders:read"] },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Productos", href: "/products", icon: Package, perms: ["products:read"] },
      { label: "Inventario", href: "/inventory", icon: Boxes, perms: ["inventory:read"] },
      { label: "Colecciones", href: "/collections", icon: Shapes, perms: ["collections:read"] },
    ],
  },
  {
    title: "Ventas",
    items: [
      { label: "Clientes", href: "/customers", icon: Users, perms: ["customers:read"] },
      { label: "Descuentos", href: "/discounts", icon: Percent, perms: ["discounts:read"] },
      { label: "Envíos e impuestos", href: "/shipping", icon: Truck, perms: ["shipping:read"] },
    ],
  },
  {
    title: "Contenido",
    items: [
      { label: "Resumen", href: "/content", icon: LayoutTemplate, perms: ["content:read"], exact: true },
      { label: "Ajustes y tema", href: "/content/settings", icon: Palette, perms: ["content:read"] },
      { label: "Menús", href: "/content/menus", icon: MenuIcon, perms: ["content:read"] },
      { label: "Plantillas", href: "/content/templates", icon: LayoutTemplate, perms: ["content:read"] },
      { label: "Páginas", href: "/content/pages", icon: FileText, perms: ["content:read"] },
      { label: "Biblioteca de medios", href: "/media", icon: ImageIcon, perms: ["content:read"] },
      { label: "Redirecciones", href: "/redirects", icon: Waypoints, perms: ["content:read"] },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Newsletter", href: "/marketing", icon: Megaphone, perms: ["marketing:read"], exact: true },
      { label: "Mensajes de contacto", href: "/marketing/contact", icon: MessageSquare, perms: ["marketing:read"] },
      { label: "Plantillas de correo", href: "/emails", icon: Mail, perms: ["marketing:read"] },
    ],
  },
  {
    title: "Equipo",
    items: [
      { label: "Personal y roles", href: "/staff", icon: ShieldCheck, perms: ["staff:read"] },
      { label: "Auditoría", href: "/audit", icon: ScrollText, perms: ["audit:read"] },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { label: "Importador", href: "/imports", icon: Upload, perms: ["import:read"] },
      { label: "Mantenimiento", href: "/settings", icon: Wrench, perms: ["settings:write"] },
    ],
  },
  {
    items: [{ label: "Mi cuenta", href: "/account", icon: UserCircle, perms: [] }],
  },
];

/** Ítems planos (útil para la búsqueda rápida). */
export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    // un ítem más específico (p. ej. /content/settings) le gana a uno "exact" o más corto
    const better = NAV_ITEMS.some((o) => o !== item && o.href.length > item.href.length && o.href.startsWith(item.href) && (pathname === o.href || pathname.startsWith(`${o.href}/`)));
    return !better;
  }
  return item.alsoActiveOn?.some((p) => pathname.startsWith(p)) ?? false;
}

/** Título de la sección activa (para document.title / topbar móvil). */
export function titleForPath(pathname: string): string {
  const item = NAV_ITEMS.find((i) => isActive(i, pathname));
  return item?.label ?? "Panel";
}

