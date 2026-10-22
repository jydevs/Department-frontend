import { apiGet, contentGet } from "./http";
import type {
  ApiContentDocument,
  ApiPageListItem,
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

export async function getPage(
  handle: string,
): Promise<(PageData & { sections: SectionEnvelope[]; publishedAt: string | null }) | null> {
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
    publishedAt: doc.publishedAt ?? null,
  };
}

/** Handles + titles of the published pages (sitemap). */
export async function listPages(): Promise<ApiPageListItem[]> {
  const list = await apiGet<ApiPageListItem[]>(`${BASE}/pages`, { tags: ["content:pages"] });
  return Array.isArray(list) ? list : [];
}
