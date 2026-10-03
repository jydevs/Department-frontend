import { Boxes, FileText, Globe, Home, Image as ImageIcon, LayoutTemplate, Mail, Menu, MessageSquare, Package, Palette, Percent, ShieldCheck, ShoppingCart, Tags, Truck, Upload, User, UserCog, Users, Wrench, ArrowRightLeft, Newspaper, type LucideIcon } from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; /** Permiso de lectura de la ruta; sin él, cualquier persona del equipo puede entrar. */ perm?: string }
export interface NavGroup { label?: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { items: [{ label: "Inicio", href: "/admin", icon: Home, perm: "analytics:read" }, { label: "Pedidos", href: "/admin/orders", icon: ShoppingCart, perm: "orders:read" }] },
  { label: "Productos", items: [
    { label: "Productos", href: "/admin/products", icon: Package, perm: "products:read" },
    { label: "Inventario", href: "/admin/inventory", icon: Boxes, perm: "inventory:read" },
    { label: "Colecciones", href: "/admin/collections", icon: Tags, perm: "collections:read" },
  ] },
  { items: [{ label: "Clientes", href: "/admin/customers", icon: Users, perm: "customers:read" }, { label: "Descuentos", href: "/admin/discounts", icon: Percent, perm: "discounts:read" }] },
  { label: "Contenido", items: [
    { label: "Resumen", href: "/admin/content", icon: Globe, perm: "content:read" },
    { label: "Ajustes y tema", href: "/admin/content/settings", icon: Palette, perm: "content:read" },
    { label: "Menús", href: "/admin/content/menus", icon: Menu, perm: "content:read" },
    { label: "Plantillas", href: "/admin/content/templates", icon: LayoutTemplate, perm: "content:read" },
    { label: "Páginas", href: "/admin/content/pages", icon: FileText, perm: "content:read" },
    { label: "Biblioteca de medios", href: "/admin/media", icon: ImageIcon, perm: "content:read" },
    { label: "Redirecciones", href: "/admin/redirects", icon: ArrowRightLeft, perm: "content:read" },
  ] },
  { label: "Marketing", items: [
    { label: "Newsletter", href: "/admin/marketing/newsletter", icon: Newspaper, perm: "marketing:read" },
    { label: "Mensajes de contacto", href: "/admin/marketing/messages", icon: MessageSquare, perm: "marketing:read" },
    { label: "Plantillas de correo", href: "/admin/emails", icon: Mail, perm: "marketing:read" },
  ] },
  { items: [{ label: "Envíos e impuestos", href: "/admin/shipping", icon: Truck, perm: "shipping:read" }] },
  { label: "Equipo", items: [
    { label: "Personal y roles", href: "/admin/staff", icon: UserCog, perm: "staff:read" },
    { label: "Auditoría", href: "/admin/audit", icon: ShieldCheck, perm: "audit:read" },
  ] },
  { label: "Herramientas", items: [
    { label: "Importador", href: "/admin/imports", icon: Upload, perm: "import:read" },
    { label: "Mantenimiento", href: "/admin/settings", icon: Wrench, perm: "settings:read" },
  ] },
  { items: [{ label: "Mi cuenta", href: "/admin/account", icon: User }] },
];

const ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
/** Ruta del menú que corresponde a `pathname` (la más específica; `/admin` solo coincide exacto). */
export function navItemFor(pathname: string): NavItem | undefined {
  const p = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/admin";
  return ITEMS.filter((i) => (i.href === "/admin" ? p === "/admin" : p === i.href || p.startsWith(`${i.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
}
/** ¿Puede esta persona abrir la ruta? Las rutas sin permiso requerido (Mi cuenta) están abiertas. */
export function canAccess(pathname: string, permissions: string[]): boolean {
  const it = navItemFor(pathname);
  return !it?.perm || permissions.includes(it.perm);
}
/** Primera ruta del menú que la persona puede abrir (aterrizaje cuando no tiene Inicio). */
export function firstAllowedRoute(permissions: string[]): string {
  return ITEMS.find((i) => !i.perm || permissions.includes(i.perm))?.href ?? "/admin/account";
}
