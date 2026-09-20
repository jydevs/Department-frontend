export type ProductBadge = "agotado" | "oferta";

export interface Product {
  /** URL-safe identifier */
  handle: string;
  name: string;
  /** price in COP, as a number of pesos */
  price: number;
  /** original price in COP when the item is on sale */
  compareAtPrice?: number;
  badge?: ProductBadge;
  /** collection handles this product belongs to */
  collections: CollectionHandle[];
  /** short label used as alt text / placeholder label */
  imageLabel: string;
  /** gallery: [0] = card image, [1] = card hover image (if present) */
  images: string[];
  /** sizes offered (mock — no inventory backend) */
  sizes: string[];
  /** short product blurb (mock copy) */
  description: string;
}

export type CollectionHandle = "all" | "men" | "women";

export interface Collection {
  handle: CollectionHandle;
  /** heading shown on the collection hero */
  title: string;
  heroImageLabel: string;
}
