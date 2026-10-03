export type ProductBadge = "agotado" | "oferta";

/** Variante comprable (en la tienda: una talla). */
export interface ProductVariant {
  id: string;
  /** etiqueta mostrada (talla) */
  size: string;
  price: number;
  compareAtPrice?: number;
  available: boolean;
}

export interface Product {
  id: string;
  /** URL-safe identifier */
  handle: string;
  name: string;
  /** precio "desde" en COP, en pesos */
  price: number;
  /** precio original en COP cuando está en oferta */
  compareAtPrice?: number;
  badge?: ProductBadge;
  /** texto alternativo de la primera foto (también etiqueta del placeholder) */
  imageLabel: string;
  /** galería: [0] = foto de la tarjeta, [1] = foto al pasar el cursor (si existe) */
  images: string[];
  /** tallas ofrecidas (derivadas de las variantes) */
  sizes: string[];
  variants: ProductVariant[];
  /** etiquetas del producto (relacionados) */
  tags: string[];
  /** texto con párrafos (sin HTML) */
  description: string;
  /** descripción saneada por el backend */
  descriptionHtml: string;
}

export type CollectionHandle = string;

export interface Collection {
  handle: CollectionHandle;
  /** título mostrado en la cabecera de la colección */
  title: string;
  heroImageLabel: string;
  heroImage?: string;
  description?: string;
}
