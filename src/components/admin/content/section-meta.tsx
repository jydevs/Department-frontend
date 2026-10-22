import {
  AlignLeft,
  AlertOctagon,
  Columns2,
  Footprints,
  GalleryHorizontal,
  Grid3x3,
  Image as ImageIcon,
  LayoutGrid,
  LayoutPanelTop,
  Mail,
  Megaphone,
  Newspaper,
  PanelTop,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  TextCursorInput,
  Type,
  Shapes,
  Layers,
  BadgeCheck,
  Rows3,
  type LucideIcon,
} from "lucide-react";

interface SectionMeta {
  icon: LucideIcon;
  description: string;
}

/** Descripciones amigables (el servidor solo entrega `label`). */
const META: Record<string, SectionMeta> = {
  "announcement-bar": { icon: Megaphone, description: "Franja fina con un aviso o una marquesina de frases." },
  "site-header": { icon: PanelTop, description: "Cabecera con logotipo, menú, búsqueda, cuenta y carrito." },
  hero: { icon: ImageIcon, description: "Portada a toda pantalla con foto, titular y botones." },
  marquee: { icon: Rows3, description: "Franja de texto que se desplaza en bucle." },
  "new-arrivals": { icon: Sparkles, description: "Banner con foto de fondo para destacar las novedades." },
  "split-banner": { icon: Columns2, description: "Mosaicos con foto que llevan a colecciones." },
  "value-props": { icon: BadgeCheck, description: "Ventajas de la tienda con icono y texto corto." },
  campaign: { icon: LayoutGrid, description: "Título y cuadrícula de productos de una colección." },
  editorial: { icon: Newspaper, description: "Manifiesto o historia de marca con texto y foto." },
  lookbook: { icon: GalleryHorizontal, description: "Galería de fotos con pie y enlace a producto." },
  newsletter: { icon: Mail, description: "Formulario para suscribirse al boletín." },
  "rich-text": { icon: AlignLeft, description: "Bloque de texto libre con Markdown." },
  footer: { icon: Footprints, description: "Pie de página con columnas de enlaces y redes." },
  "page-header": { icon: Type, description: "Cabecera de página con titular grande y texto." },
  "cta-banner": { icon: Tag, description: "Banner con llamada a la acción y botones." },
  "contact-form": { icon: TextCursorInput, description: "Formulario de contacto para los visitantes." },
  "collection-hero": { icon: Layers, description: "Cabecera de la colección con foto y pestañas." },
  "product-grid": { icon: Grid3x3, description: "Cuadrícula de productos con filtros y orden." },
  "product-detail": { icon: ShoppingBag, description: "Textos de la ficha de producto y compra." },
  "search-panel": { icon: Search, description: "Panel de búsqueda con sugerencias." },
  "cart-drawer": { icon: ShoppingBag, description: "Textos del carrito lateral." },
  "error-hero": { icon: AlertOctagon, description: "Cabecera de la página de error 404." },
};

const FALLBACK: SectionMeta = { icon: Shapes, description: "Sección de contenido." };

export function sectionMeta(type: string): SectionMeta {
  return META[type] ?? FALLBACK;
}

export function SectionIcon({ type, size = 16, className }: { type: string; size?: number; className?: string }) {
  const Icon = sectionMeta(type).icon ?? LayoutPanelTop;
  return <Icon aria-hidden size={size} className={className} />;
}

export const TEMPLATE_META: Record<string, { label: string; description: string; path: string }> = {
  home: { label: "Inicio", description: "La portada de la tienda.", path: "/" },
  collection: { label: "Colección", description: "Página de cada colección con su cuadrícula de productos.", path: "/collections/all" },
  product: { label: "Producto", description: "Ficha de cada producto.", path: "/products" },
  cart: { label: "Carrito", description: "Panel lateral del carrito.", path: "/cart" },
  search: { label: "Búsqueda", description: "Panel y resultados de búsqueda.", path: "/search" },
  "404": { label: "Error 404", description: "Página que se muestra cuando no se encuentra algo.", path: "/no-existe" },
  layout: { label: "Cabecera y pie (global)", description: "Cabecera, boletín y pie que se repiten en todo el sitio.", path: "/" },
  page: { label: "Página genérica", description: "Plantilla base de las páginas.", path: "/pages" },
};

export function templateLabel(key: string): string {
  return TEMPLATE_META[key]?.label ?? key;
}
