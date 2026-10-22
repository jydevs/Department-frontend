/** Types that mirror the backend's storefront responses (see Department-backend docs/API.md and CMS-SECTIONS.md). */

/* ── shared ──────────────────────────────────────────────── */

export interface ApiImage {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface ApiPage<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  requestId?: string;
}

/* ── catalogue ───────────────────────────────────────────── */

/** Entry of `GET /storefront/products`, `/collections/:handle` and `/search`. Extra fields are optional on purpose. */
export interface ApiProductSummary {
  id: string;
  handle: string;
  title: string;
  /** lowest variant price, in pesos */
  price: number;
  image: ApiImage | null;
  available: boolean;
  /** not sent today; used when a future API version adds it */
  compareAtPrice?: number | null;
}

export interface ApiOptionValue {
  id: string;
  name: string;
  value: string;
}

export interface ApiVariant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  optionValues: ApiOptionValue[];
}

export interface ApiOption {
  id: string;
  name: string;
  values: string[];
}

export interface ApiMetafield {
  key: string;
  value: string;
}

export interface ApiSeo {
  title: string | null;
  description: string | null;
}

export interface ApiProduct {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  variants: ApiVariant[];
  options: ApiOption[];
  media: (ApiImage & { id: string })[];
  metafields: ApiMetafield[];
  seo: ApiSeo | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCollectionSummary {
  id: string;
  handle: string;
  title: string;
  image: ApiImage | null;
}

export interface ApiCollection extends ApiCollectionSummary {
  descriptionHtml: string | null;
  seo: ApiSeo | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCollectionResponse {
  collection: ApiCollection;
  products: ApiPage<ApiProductSummary>;
}

export interface ApiSearchResponse {
  products: ApiProductSummary[];
  collections: ApiCollectionSummary[];
}

/* ── content (CMS) ───────────────────────────────────────── */

export type ContentKind = "settings" | "menu" | "template" | "page";

export interface ApiContentDocument<T> {
  kind: ContentKind;
  key: string;
  title: string | null;
  data: T;
  publishedAt: string | null;
}

export interface ApiPageListItem {
  handle: string;
  title: string | null;
}

export interface ApiRedirect {
  from: string;
  to: string;
  status: number;
}

export interface SiteSettings {
  brand: {
    name: string;
    tagline?: string;
    description?: string;
    logoMediaUrl?: string;
    /** text of the drawn script wordmark (no logo image) */
    logoText?: string;
    faviconMediaUrl?: string;
  };
  theme: {
    colors: {
      background: string;
      foreground: string;
      accent: string;
      muted?: string;
      border?: string;
      accentDark?: string;
      accentLight?: string;
      info?: string;
      gray100?: string;
      gray300?: string;
      gray500?: string;
      gray900?: string;
    };
    fonts: { heading: string; body: string; condensed?: string; script?: string };
    colorScheme?: "dark" | "light";
    /** film-grain texture over the page (default on) */
    grain?: boolean;
  };
  seo: { titleTemplate: string; defaultTitle?: string; defaultDescription: string; ogImageUrl?: string };
  social: Partial<Record<"instagram" | "tiktok" | "facebook" | "youtube" | "pinterest" | "x", string>>;
  announcement: {
    enabled: boolean;
    text: string;
    items?: string[];
    href?: string;
    backgroundColor?: string;
    textColor?: string;
    separator?: string;
    duration?: number;
  };
  store: { currency: "COP"; locale: "es-CO"; contactEmail?: string; whatsapp?: string };
}

export type MenuLink = { type: "collection" | "product" | "page"; handle: string } | { type: "url"; url: string };

export interface MenuItem {
  id: string;
  label: string;
  link: MenuLink;
  children?: MenuItem[];
}

export interface MenuData {
  items: MenuItem[];
}

export interface SectionBlock {
  id: string;
  type: string;
  settings?: Record<string, unknown>;
}

export interface SectionEnvelope {
  id: string;
  type: string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
  blocks?: SectionBlock[];
}

export interface TemplateData {
  sections: SectionEnvelope[];
}

export interface PageData {
  title: string;
  handle: string;
  template?: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: SectionEnvelope[];
}

/** Template keys the API accepts (`GET /storefront/content/templates/:key`). */
export type TemplateKey = "layout" | "home" | "collection" | "product" | "search" | "cart" | "404" | "page";
