/**
 * View-model of the catalogue used by the UI components (cards, grid, product page, cart).
 * It is built from the API's responses in `./service.ts`; components never see raw API shapes.
 */

export type ProductBadge = "agotado" | "oferta";

/** One purchasable variant (the storefront shows them as the "Talla" chips). */
export interface ProductVariant {
  /** API variant id: what the cart sends to the backend */
  id: string;
  /** chip label, e.g. "M" */
  label: string;
  /** price in COP pesos */
  price: number;
  compareAtPrice?: number;
  available: boolean;
}

export interface Product {
  /** URL-safe identifier */
  handle: string;
  name: string;
  /** lowest price in COP pesos */
  price: number;
  /** original price while on sale */
  compareAtPrice?: number;
  badge?: ProductBadge;
  /** alt text of the main photo */
  imageLabel: string;
  /** gallery: [0] = card image, [1] = card hover image (when present) */
  images: string[];
  /** labels of the variants (same order as `variants`) */
  sizes: string[];
  variants: ProductVariant[];
  /** false when every variant is sold out (or no variant info is known and the API says so) */
  available: boolean;
  /** plain-text blurb (search / SEO) */
  description: string;
  /** sanitised HTML of the description (product page) */
  descriptionHtml?: string;
  /** false for single-variant products ("Default Title"): the size picker is hidden */
  needsSize: boolean;
  vendor?: string;
  productType?: string;
  tags: string[];
  /** public metafields as label → text */
  metafields: { key: string; value: string }[];
}
