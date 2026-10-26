import type { Product, ProductBadge, ProductVariant } from "@/data/types";
import type { ApiProductSummary, ApiVariant } from "./types";

/** Máximo de variantes activas que devuelve un listado: si llega justo al tope puede estar truncado y se pide el detalle. */
export const LISTING_VARIANT_CAP = 50;

/** ¿El item del listado trae todo lo necesario para una tarjeta completa? (backends antiguos no traen `variants`.) */
export function isRich(s: ApiProductSummary): boolean {
  return Array.isArray(s.variants) && Array.isArray(s.options) && s.variants.length > 0 && s.variants.length < LISTING_VARIANT_CAP;
}

/** Variante de la API de detalle (`optionValues`) → variante de UI. Un valor por opción, en el orden de las opciones del producto. */
export function toVariant(v: Pick<ApiVariant, "id" | "title" | "sku" | "price" | "compareAtPrice" | "available">, valueOf: (optionName: string) => string, optionNames: string[]): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    values: optionNames.map((name) => valueOf(name)),
    price: v.price,
    compareAtPrice: v.compareAtPrice != null && v.compareAtPrice > v.price ? v.compareAtPrice : undefined,
    available: v.available,
    sku: v.sku ?? undefined,
  };
}

/** Variante que representa al producto en tarjetas y "desde": la más barata (entre las disponibles si hay alguna); a igual precio, la que está en oferta. */
export function representative(variants: ProductVariant[]): ProductVariant | undefined {
  const pool = variants.some((v) => v.available) ? variants.filter((v) => v.available) : variants;
  return pool.reduce<ProductVariant | undefined>(
    (best, v) => (!best || v.price < best.price || (v.price === best.price && v.compareAtPrice !== undefined && best.compareAtPrice === undefined) ? v : best),
    undefined,
  );
}

/** Precio, precio anterior (de la MISMA variante) e insignia a partir de las variantes. */
export function pricing(variants: ProductVariant[], fallbackPrice = 0): { price: number; compareAtPrice?: number; badge?: ProductBadge } {
  const rep = representative(variants);
  const compareAtPrice = rep?.compareAtPrice;
  const available = variants.some((v) => v.available);
  return { price: rep?.price ?? fallbackPrice, compareAtPrice, badge: !available ? "agotado" : compareAtPrice !== undefined ? "oferta" : undefined };
}

/**
 * Producto de UI a partir de un item de listado/búsqueda. Si el item es "rico" (backend actual) la tarjeta queda completa
 * (tallas, oferta, 2.ª foto, disponibilidad por variante); si no, queda la versión ligera (sin variantes) y el llamador
 * decide si pide el detalle. Segura para el cliente.
 */
export function fromSummary(s: ApiProductSummary): Product {
  const images = (s.images?.length ? s.images : s.image ? [s.image] : []).map((i) => i.url);
  const base = {
    id: s.id, handle: s.handle, name: s.title, tags: [], imageLabel: s.images?.[0]?.alt || s.image?.alt || s.title, images,
    description: "", descriptionHtml: "",
  };
  if (!isRich(s)) {
    return { ...base, price: s.price, compareAtPrice: s.compareAtPrice ?? undefined, badge: s.available ? undefined : "agotado", options: [], variants: [] };
  }
  const options = (s.options ?? []).map((o) => ({ name: o.name, values: o.values }));
  const names = options.map((o) => o.name);
  const variants = (s.variants ?? []).map((v) => toVariant(v, (name) => v.values.find((x) => x.name === name)?.value ?? "", names));
  return { ...base, ...pricing(variants, s.price), options, variants };
}
