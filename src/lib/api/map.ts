import type { Product } from "@/data/types";
import type { ApiProductSummary } from "./types";

/** Versión ligera de producto (sin variantes ni opciones) a partir del resumen de un listado/búsqueda. Segura para el cliente. */
export function fromSummary(s: ApiProductSummary): Product {
  return {
    id: s.id, handle: s.handle, name: s.title, price: s.price, badge: s.available ? undefined : "agotado", tags: [],
    imageLabel: s.image?.alt || s.title, images: s.image ? [s.image.url] : [], options: [], variants: [], description: "", descriptionHtml: "",
  };
}
