import { Boxes, FileText, Globe, Home, Image as ImageIcon, LayoutTemplate, Mail, Menu, MessageSquare, Package, Palette, Percent, ShieldCheck, ShoppingCart, Tags, Truck, Upload, User, UserCog, Users, Wrench, ArrowRightLeft, Newspaper, type LucideIcon } from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; perm: string }
export interface NavGroup { label?: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { items: [{ label: "Inicio", href: "/", icon: Home, perm: "analytics:read" }, { label: "Pedidos", href: "/orders", icon: ShoppingCart, perm: "orders:read" }] },
  { label: "Productos", items: [
    { label: "Productos", href: "/products", icon: Package, perm: "products:read" },
    { label: "Inventario", href: "/inventory", icon: Boxes, perm: "inventory:read" },
    { label: "Colecciones", href: "/collections", icon: Tags, perm: "collections:read" },
  ] },
  { items: [{ label: "Clientes", href: "/customers", icon: Users, perm: "customers:read" }, { label: "Descuentos", href: "/discounts", icon: Percent, perm: "discounts:read" }] },
  { label: "Contenido", items: [
    { label: "Resumen", href: "/content", icon: Globe, perm: "content:read" },
    { label: "Ajustes y tema", href: "/content/settings", icon: Palette, perm: "content:read" },
    { label: "Menús", href: "/content/menus", icon: Menu, perm: "content:read" },
    { label: "Plantillas", href: "/content/templates", icon: LayoutTemplate, perm: "content:read" },
    { label: "Páginas", href: "/content/pages", icon: FileText, perm: "content:read" },
    { label: "Biblioteca de medios", href: "/media", icon: ImageIcon, perm: "content:read" },
    { label: "Redirecciones", href: "/redirects", icon: ArrowRightLeft, perm: "content:read" },
  ] },
  { label: "Marketing", items: [
    { label: "Newsletter", href: "/marketing/newsletter", icon: Newspaper, perm: "marketing:read" },
    { label: "Mensajes de contacto", href: "/marketing/messages", icon: MessageSquare, perm: "marketing:read" },
    { label: "Plantillas de correo", href: "/emails", icon: Mail, perm: "marketing:read" },
  ] },
  { items: [{ label: "Envíos e impuestos", href: "/shipping", icon: Truck, perm: "shipping:read" }] },
  { label: "Equipo", items: [
    { label: "Personal y roles", href: "/staff", icon: UserCog, perm: "staff:read" },
    { label: "Auditoría", href: "/audit", icon: ShieldCheck, perm: "audit:read" },
  ] },
  { label: "Herramientas", items: [
    { label: "Importador", href: "/imports", icon: Upload, perm: "import:read" },
    { label: "Mantenimiento", href: "/settings", icon: Wrench, perm: "settings:read" },
  ] },
  { items: [{ label: "Mi cuenta", href: "/account", icon: User, perm: "analytics:read" }] },
];
