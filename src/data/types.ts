export type ProductBadge = "agotado" | "oferta";

/** Opción del producto (Talla, Color…) con sus valores en el orden del catálogo. */
export interface ProductOption {
  name: string;
  values: string[];
}

/** Variante comprable: una combinación de valores de las opciones del producto. */
export interface ProductVariant {
  id: string;
  /** título completo de la variante ("Negro / M") */
  title: string;
  /** valor elegido de cada opción, en el mismo orden que `Product.options` */
  values: string[];
  price: number;
  compareAtPrice?: number;
  available: boolean;
  sku?: string;
}

export interface Product {
  id: string;
  /** URL-safe identifier */
  handle: string;
  name: string;
  /** precio "desde" en COP, en pesos (el de la variante más barata) */
  price: number;
  /** precio original en COP cuando esa misma variante está en oferta */
  compareAtPrice?: number;
  badge?: ProductBadge;
  /** texto alternativo de la primera foto (también etiqueta del placeholder) */
  imageLabel: string;
  /** galería: [0] = foto de la tarjeta, [1] = foto al pasar el cursor (si existe) */
  images: string[];
  /** opciones del producto (vacío en las versiones ligeras creadas desde un listado) */
  options: ProductOption[];
  variants: ProductVariant[];
  /** etiquetas del producto (relacionados) */
  tags: string[];
  /** texto con párrafos (sin HTML) */
  description: string;
  /** descripción saneada por el backend */
  descriptionHtml: string;
  /** SEO propio del producto (`seo.title` / `seo.description` del catálogo) */
  seoTitle?: string;
  seoDescription?: string;
  /** última modificación (ISO) */
  updatedAt?: string;
}

export type CollectionHandle = string;

export interface Collection {
  handle: CollectionHandle;
  /** título mostrado en la cabecera de la colección */
  title: string;
  heroImageLabel: string;
  heroImage?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt?: string;
}
