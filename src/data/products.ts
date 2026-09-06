import type { Collection, CollectionHandle, Product } from "./types";

/*
 * Mock catalogue transcribed from the reference screenshots of daregulardept.com.
 * Prices are stored exactly as displayed on the live site (some are clearly
 * data-entry quirks, e.g. SAMO - HOODIE at "$190,00 COP").
 */
export const products: Product[] = [
  {
    handle: "basic-r2r-t-shirt",
    name: "Basic R2R - T Shirt",
    price: 99000,
    badge: "agotado",
    collections: ["all", "men"],
    imageLabel: "Basic R2R tee — front",
  },
  {
    handle: "four-oh-four-short",
    name: "Four Oh Four - Short",
    price: 99000,
    collections: ["all", "men"],
    imageLabel: "Four Oh Four short",
  },
  {
    handle: "get-rich-cropped-boxy-fit",
    name: "Get Rich - Cropped Boxy Fit",
    price: 119,
    collections: ["all", "women"],
    imageLabel: "Get Rich cropped boxy tee",
  },
  {
    handle: "get-rich-or-die-tryin-boxy-fit",
    name: "Get Rich Or Die Tryin' - Boxy Fit",
    price: 0,
    collections: ["all", "men"],
    imageLabel: "Get Rich Or Die Tryin' boxy tee",
  },
  {
    handle: "guerrilla-short",
    name: "Guerrilla - Short",
    price: 120000,
    collections: ["all", "men"],
    imageLabel: "Guerrilla short",
  },
  {
    handle: "rags-2-ritches-cropped-boxy-fit",
    name: "Rags 2 Ritches - Cropped Boxy Fit",
    price: 99000,
    collections: ["all", "women"],
    imageLabel: "Rags 2 Ritches cropped boxy tee",
  },
  {
    handle: "samo-hoodie",
    name: "Samo - Hoodie",
    price: 190,
    collections: ["all", "men"],
    imageLabel: "Samo hoodie",
  },
  {
    handle: "take-the-risk-boxy-fit",
    name: "Take The Risk - Boxy Fit",
    price: 120000,
    compareAtPrice: 180000,
    badge: "oferta",
    collections: ["all", "men"],
    imageLabel: "Take The Risk boxy tee",
  },
];

export const collections: Record<CollectionHandle, Collection> = {
  all: { handle: "all", title: "Clothes", heroImageLabel: "Clothes collection hero" },
  men: { handle: "men", title: "Clothes", heroImageLabel: "Men collection hero" },
  women: { handle: "women", title: "Clothes", heroImageLabel: "Women collection hero" },
};

export function getCollectionProducts(handle: CollectionHandle): Product[] {
  return products.filter((product) => product.collections.includes(handle));
}

/** Products featured under "Rags To Riches – Extended Version" on the home page. */
export function getCampaignProducts(): Product[] {
  return getCollectionProducts("all").slice(0, 6);
}
