import type { Collection, CollectionHandle, Product } from "./types";

/*
 * Mock catalogue transcribed from the reference screenshots of daregulardept.com.
 * Prices are stored exactly as displayed on the live site (some are clearly
 * data-entry quirks, e.g. SAMO - HOODIE at "$190,00 COP").
 * Images / sizes / descriptions are mock data (no inventory backend yet).
 */

/** `/images/product-<handle>.jpg`, then `-2`, `-3`… */
function gallery(handle: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? `/images/product-${handle}.jpg` : `/images/product-${handle}-${i + 1}.jpg`,
  );
}

const SIZES = ["S", "M", "L", "XL"];

export const products: Product[] = [
  {
    handle: "basic-r2r-t-shirt",
    name: "Basic R2R - T Shirt",
    price: 99000,
    badge: "agotado",
    collections: ["all", "men"],
    imageLabel: "Basic R2R tee",
    images: gallery("basic-r2r-t-shirt", 3),
    sizes: SIZES,
    description: "Camiseta básica de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "four-oh-four-short",
    name: "Four Oh Four - Short",
    price: 99000,
    collections: ["all", "men"],
    imageLabel: "Four Oh Four short",
    images: gallery("four-oh-four-short", 3),
    sizes: SIZES,
    description: "Short con el estampado 404, de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "get-rich-cropped-boxy-fit",
    name: "Get Rich - Cropped Boxy Fit",
    price: 119,
    collections: ["all", "women"],
    imageLabel: "Get Rich cropped boxy tee",
    images: gallery("get-rich-cropped-boxy-fit", 2),
    sizes: SIZES,
    description: "Camiseta cropped de corte boxy, de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "get-rich-or-die-tryin-boxy-fit",
    name: "Get Rich Or Die Tryin' - Boxy Fit",
    price: 0,
    collections: ["all", "men"],
    imageLabel: "Get Rich Or Die Tryin' boxy tee",
    images: gallery("get-rich-or-die-tryin-boxy-fit", 2),
    sizes: SIZES,
    description: "Camiseta de corte boxy, de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "guerrilla-short",
    name: "Guerrilla - Short",
    price: 120000,
    collections: ["all", "men"],
    imageLabel: "Guerrilla short",
    images: gallery("guerrilla-short", 3),
    sizes: SIZES,
    description: "Short de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "rags-2-ritches-cropped-boxy-fit",
    name: "Rags 2 Ritches - Cropped Boxy Fit",
    price: 99000,
    collections: ["all", "women"],
    imageLabel: "Rags 2 Ritches cropped boxy tee",
    images: gallery("rags-2-ritches-cropped-boxy-fit", 2),
    sizes: SIZES,
    description: "Camiseta cropped de corte boxy, de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "samo-hoodie",
    name: "Samo - Hoodie",
    price: 190,
    collections: ["all", "men"],
    imageLabel: "Samo hoodie",
    images: gallery("samo-hoodie", 3),
    sizes: SIZES,
    description: "Hoodie de la colección Rags to Riches – Extended Version.",
  },
  {
    handle: "take-the-risk-boxy-fit",
    name: "Take The Risk - Boxy Fit",
    price: 120000,
    compareAtPrice: 180000,
    badge: "oferta",
    collections: ["all", "men"],
    imageLabel: "Take The Risk boxy tee",
    images: gallery("take-the-risk-boxy-fit", 2),
    sizes: SIZES,
    description: "Camiseta de corte boxy, de la colección Rags to Riches – Extended Version.",
  },
];

export const collections: Record<CollectionHandle, Collection> = {
  all: { handle: "all", title: "Clothes", heroImageLabel: "Clothes collection hero" },
  men: { handle: "men", title: "Clothes", heroImageLabel: "Men collection hero" },
  women: { handle: "women", title: "Clothes", heroImageLabel: "Women collection hero" },
};

export function getProduct(handle: string): Product | undefined {
  return products.find((product) => product.handle === handle);
}

export function getCollectionProducts(handle: CollectionHandle): Product[] {
  return products.filter((product) => product.collections.includes(handle));
}

/** Products featured under "Rags To Riches – Extended Version" on the home page. */
export function getCampaignProducts(): Product[] {
  return getCollectionProducts("all").slice(0, 6);
}

/** Other products, for "you may also like". Same collection first, then the rest. */
export function getRelatedProducts(handle: string, limit = 4): Product[] {
  const current = getProduct(handle);
  if (!current) return products.slice(0, limit);
  const others = products.filter((p) => p.handle !== handle);
  const shared = (p: Product) => p.collections.filter((c) => c !== "all" && current.collections.includes(c)).length;
  return [...others].sort((a, b) => shared(b) - shared(a)).slice(0, limit);
}
