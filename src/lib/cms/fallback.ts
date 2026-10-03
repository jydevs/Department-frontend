import type { CmsSection } from "./types";

/**
 * Plantillas mínimas por si el CMS aún no tiene el documento (p. ej. base de datos recién creada y
 * `SEED_DEFAULT_CONTENT=false`). Las plantillas reales se editan en el panel (`/admin/content/templates`).
 */
const s = (id: string, type: string, settings: Record<string, unknown> = {}, blocks?: CmsSection["blocks"]): CmsSection => ({ id, type, enabled: true, settings, blocks });

/** Home mínima si el CMS aún no tiene la plantilla `home` (404). */
export const fallbackHome = (brand: string, tagline: string): CmsSection[] => [
  s("home-hero", "hero", { height: "large", heading: brand, subheading: tagline, ctaLabel: "Ver la colección", ctaHref: "/collections/all" }),
];

export const FALLBACK_COLLECTION: CmsSection[] = [
  s("collection-hero", "collection-hero", { showTabs: false }),
  s("collection-grid", "product-grid", { source: "current-collection", showFilters: true }),
];
export const FALLBACK_PRODUCT: CmsSection[] = [
  s("product-detail", "product-detail"),
  s("product-related", "product-grid", { source: "related", eyebrow: "01 — Selección", heading: "Te puede interesar", limit: 4, showFilters: false }),
];
export const FALLBACK_404: CmsSection[] = [
  s("error-hero", "error-hero", { eyebrow: "Error", code: "404" }),
  s("error-cta", "cta-banner", { text: "Esta página no existe — o nunca la vieron.", layout: "split", ctaLabel: "Volver al inicio", ctaHref: "/", ctaVariant: "solid" }),
];
