import { connection } from "next/server";
import { getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/api/media";
import { renderOg } from "@/lib/og";

const size = { width: 1200, height: 630 };
const contentType = "image/png";

/** The alt text comes from the CMS (settings/site), never hard-coded. */
export async function generateImageMetadata() {
  const { brand, seo } = await getSiteSettingsOrDefault();
  return [{ id: "default", alt: seo.defaultTitle || brand.name, size, contentType }];
}

/** Share card of the site: the CMS' og image (settings/site → seo.ogImageUrl) or the home hero photo. */
export default async function Image() {
  await connection();
  const settings = await getSiteSettingsOrDefault();
  let hero: string | null = null;
  try {
    const home = await getTemplate("home");
    const section = home?.sections.find((s) => s.type === "hero" && s.enabled !== false);
    const url = section?.settings?.imageUrl;
    hero = typeof url === "string" ? resolveMediaUrl(url) : null;
  } catch {
    hero = null;
  }

  return renderOg({
    photo: resolveMediaUrl(settings.seo.ogImageUrl) ?? hero ?? "/images/home-hero.jpg",
    kicker: settings.announcement.text || undefined,
    title: settings.brand.tagline || settings.brand.name,
  });
}
