import { apiGet, contentGet } from "./http";
import type {
  ApiContentDocument,
  ApiPageListItem,
  ApiRedirect,
  MenuData,
  PageData,
  SectionEnvelope,
  SiteSettings,
  TemplateData,
  TemplateKey,
} from "./types";
import { FALLBACK_SETTINGS, mergeSettings } from "@/lib/cms/defaults";

const BASE = "/storefront/content";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps only well-formed section envelopes, so a malformed document can never crash a page. */
export function cleanSections(value: unknown): SectionEnvelope[] {
  if (!Array.isArray(value)) return [];
  const out: SectionEnvelope[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.type !== "string") continue;
    const section: SectionEnvelope = {
      id: raw.id,
      type: raw.type,
      enabled: raw.enabled !== false,
      settings: isRecord(raw.settings) ? raw.settings : {},
    };
    if (Array.isArray(raw.blocks)) {
      section.blocks = raw.blocks.flatMap((b) =>
        isRecord(b) && typeof b.id === "string" && typeof b.type === "string"
          ? [{ id: b.id, type: b.type, settings: isRecord(b.settings) ? b.settings : {} }]
          : [],
      );
    }
    out.push(section);
  }
  return out;
}

/** `settings/site`, merged over built-in defaults. Returns null only when the API is unreachable / has no document. */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const doc = await contentGet<ApiContentDocument<Partial<SiteSettings>>>(`${BASE}/settings`, ["content:settings:site"]);
  if (!doc || !isRecord(doc.data)) return null;
  return mergeSettings(doc.data);
}

/** Same as getSiteSettings() but never throws and never returns null (falls back to the built-in defaults). */
export async function getSiteSettingsOrDefault(): Promise<SiteSettings> {
  try {
    return (await getSiteSettings()) ?? FALLBACK_SETTINGS;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export async function getMenu(key: string): Promise<MenuData | null> {
  const doc = await contentGet<ApiContentDocument<MenuData>>(`${BASE}/menus/${encodeURIComponent(key)}`, [`content:menu:${key}`]);
  if (!doc || !isRecord(doc.data) || !Array.isArray(doc.data.items)) return null;
  return doc.data;
}

export async function getTemplate(key: TemplateKey): Promise<TemplateData | null> {
  const doc = await contentGet<ApiContentDocument<TemplateData>>(`${BASE}/templates/${encodeURIComponent(key)}`, [
    `content:template:${key}`,
  ]);
  if (!doc || !isRecord(doc.data)) return null;
  return { sections: cleanSections(doc.data.sections) };
}

export async function getPage(handle: string): Promise<(PageData & { sections: SectionEnvelope[] }) | null> {
  const doc = await contentGet<ApiContentDocument<PageData>>(`${BASE}/pages/${encodeURIComponent(handle)}`, [
    `content:page:${handle}`,
    "content:pages",
  ]);
  if (!doc || !isRecord(doc.data)) return null;
  return {
    ...doc.data,
    title: typeof doc.data.title === "string" ? doc.data.title : (doc.title ?? handle),
    handle,
    sections: cleanSections(doc.data.sections),
  };
}

/** Handles + titles of the published pages (sitemap). */
export async function listPages(): Promise<ApiPageListItem[]> {
  const list = await apiGet<ApiPageListItem[]>(`${BASE}/pages`, { tags: ["content:pages"] });
  return Array.isArray(list) ? list : [];
}

export interface ContentBundle {
  settings: SiteSettings | null;
  menus: Record<string, MenuData>;
  template: TemplateData | null;
}

/** `GET /storefront/content/bundle?template=…` — one round trip with settings, menus and a template. Not available in preview. */
export async function getBundle(template: TemplateKey | "page"): Promise<ContentBundle | null> {
  const raw = await apiGet<{
    settings?: ApiContentDocument<Partial<SiteSettings>>;
    menus?: Record<string, ApiContentDocument<MenuData>>;
    template?: ApiContentDocument<TemplateData>;
  }>(`${BASE}/bundle`, {
    query: { template },
    tags: ["content:settings:site", "content:menu:main", "content:menu:footer", `content:template:${template}`],
  });
  if (!raw) return null;
  const menus: Record<string, MenuData> = {};
  for (const [key, doc] of Object.entries(raw.menus ?? {})) {
    if (doc && isRecord(doc.data) && Array.isArray(doc.data.items)) menus[key] = doc.data;
  }
  return {
    settings: raw.settings && isRecord(raw.settings.data) ? mergeSettings(raw.settings.data) : null,
    menus,
    template: raw.template && isRecord(raw.template.data) ? { sections: cleanSections(raw.template.data.sections) } : null,
  };
}

/** Active redirects (`GET /storefront/redirects`). */
export async function getRedirects(): Promise<ApiRedirect[]> {
  const list = await apiGet<ApiRedirect[]>("/storefront/redirects", { tags: ["redirects"] });
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && typeof r.from === "string" && typeof r.to === "string" && typeof r.status === "number");
}
