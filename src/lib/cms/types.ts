/** Modelo de contenido del CMS (documentos de `/api/v1/storefront/content/*`). */
export type Settings = Record<string, unknown>;
export interface CmsBlock { id: string; type: string; settings: Settings }
export interface CmsSection { id: string; type: string; enabled: boolean; settings: Settings; blocks?: CmsBlock[] }
export interface TemplateData { sections: CmsSection[] }
export interface PageData { title?: string; handle?: string; template?: string; seoTitle?: string; seoDescription?: string; sections: CmsSection[] }

export interface MenuLink { type: "collection" | "product" | "page" | "url"; handle?: string; url?: string }
export interface MenuItem { id: string; label: string; link: MenuLink; children?: MenuItem[] }
export interface MenuData { items: MenuItem[] }

export interface SiteSettings {
  brand?: { name?: string; tagline?: string; description?: string; logoMediaUrl?: string };
  theme?: { colors?: Record<string, string>; fonts?: Record<string, string>; colorScheme?: string };
  seo?: { titleTemplate?: string; defaultTitle?: string; defaultDescription?: string; ogImageUrl?: string };
  social?: Record<string, string | undefined>;
  announcement?: { enabled?: boolean; text?: string; items?: string[]; href?: string; backgroundColor?: string; textColor?: string; duration?: number };
  store?: { currency?: string; locale?: string; contactEmail?: string; whatsapp?: string };
}

/* ── lectores tipados de ajustes (cada sección tiene `settings` sin esquema en tiempo de compilación) ── */
export const str = (s: Settings, k: string, d = ""): string => (typeof s[k] === "string" ? (s[k] as string) : d);
export const optStr = (s: Settings, k: string): string | undefined => (typeof s[k] === "string" && (s[k] as string) !== "" ? (s[k] as string) : undefined);
export const bool = (s: Settings, k: string, d = false): boolean => (typeof s[k] === "boolean" ? (s[k] as boolean) : d);
export const num = (s: Settings, k: string, d: number): number => (typeof s[k] === "number" && Number.isFinite(s[k]) ? (s[k] as number) : d);
export const oneOf = <T extends string>(s: Settings, k: string, allowed: readonly T[], d: T): T => (allowed.includes(s[k] as T) ? (s[k] as T) : d);

export function sectionOf(sections: CmsSection[] | undefined, type: string): CmsSection | undefined {
  return sections?.find((x) => x.enabled && x.type === type);
}
export const blocksOf = (s: CmsSection, type?: string): CmsBlock[] => (s.blocks ?? []).filter((b) => !type || b.type === type);
