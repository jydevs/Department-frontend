import type { Product } from "@/data/types";

/** Lowercases and strips accents so "Camíseta" matches "camiseta". */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Splits a raw query into normalised, non-empty terms. */
export function toTerms(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

/**
 * Client-side product search. Every whitespace-separated term must appear in
 * the product name, image label or handle (accent/case-insensitive). Products
 * whose *name* alone satisfies the query rank first; otherwise the catalogue
 * order is preserved.
 */
export function searchProducts(query: string, catalogue: readonly Product[]): Product[] {
  const terms = toTerms(query);
  if (terms.length === 0) return [];

  const ranked: { product: Product; rank: number; index: number }[] = [];
  catalogue.forEach((product, index) => {
    const name = normalizeText(product.name);
    const haystack = `${name} ${normalizeText(product.imageLabel)} ${normalizeText(
      product.handle.replace(/-/g, " "),
    )}`;
    if (!terms.every((term) => haystack.includes(term))) return;
    const rank = terms.every((term) => name.includes(term)) ? 0 : 1;
    ranked.push({ product, rank, index });
  });

  return ranked.sort((a, b) => a.rank - b.rank || a.index - b.index).map((r) => r.product);
}
