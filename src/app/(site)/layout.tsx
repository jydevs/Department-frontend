import type { Metadata, Viewport } from "next";
import { cookies, draftMode } from "next/headers";
import { connection } from "next/server";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OverlayProvider } from "@/components/layout/OverlayProvider";
import { PreviewBar } from "@/components/layout/PreviewBar";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/account/config";
import { CustomerProvider } from "@/lib/account/useCustomer";
import { getSiteSettingsOrDefault } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/api/media";
import { loadLayout } from "@/lib/cms/layout";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { INDEXABLE, SITE_URL } from "@/lib/site";
import { themeMeta, themeStyle } from "@/lib/theme";

/**
 * Site-wide metadata comes from the CMS (settings/site → brand + seo).
 * Pages add their own title; `title.template` wraps it ("%s — Daregular Dept.").
 */
export async function generateMetadata(): Promise<Metadata> {
  const { brand, seo } = await getSiteSettingsOrDefault();
  const og = resolveMediaUrl(seo.ogImageUrl);
  // tab icon from the CMS (settings/site → brand.faviconMediaUrl); the built-in /favicon.svg otherwise
  const favicon = resolveMediaUrl(brand.faviconMediaUrl) ?? "/favicon.svg";
  // Next only substitutes "%s": a template without it would replace every page title by the template itself
  const titleTemplate = seo.titleTemplate.includes("%s") ? seo.titleTemplate : `%s — ${brand.name}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.defaultTitle || brand.name,
      template: titleTemplate,
    },
    description: seo.defaultDescription,
    applicationName: brand.name,
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    openGraph: {
      type: "website",
      siteName: brand.name,
      locale: "es_CO",
      title: brand.name,
      description: seo.defaultDescription,
      ...(og ? { images: [{ url: og }] } : null),
    },
    twitter: {
      card: "summary_large_image",
      title: brand.name,
      description: seo.defaultDescription,
    },
    // stay out of search indexes unless explicitly enabled (NEXT_PUBLIC_INDEXABLE=true)
    robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const meta = themeMeta(await getSiteSettingsOrDefault());
  return { themeColor: meta.themeColor, colorScheme: meta.colorScheme };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Rendered per request: CMS content is read through the Next data cache (revalidated by tag / every 60 s),
  // so a build never needs the API and an outage can never freeze an error page into the cache.
  await connection();
  const [layout, draft, jar] = await Promise.all([loadLayout(), draftMode(), cookies()]);
  // the session cookies are httpOnly: the server only learns whether they exist (no API call, no token read)
  const hasSession = Boolean(jar.get(ACCESS_COOKIE)?.value || jar.get(REFRESH_COOKIE)?.value);

  return (
    <html
      lang="es"
      className={`${FONT_CLASS_NAMES} h-full`}
      style={themeStyle(layout.settings, { announcementVisible: layout.announcementVisible })}
    >
      <body className="min-h-full flex flex-col bg-dept-black text-dept-white">
        <a href="#main" className="skip-link">
          {layout.skipLinkLabel}
        </a>
        <CustomerProvider hasSession={hasSession}>
          <OverlayProvider
            searchConfig={layout.searchConfig}
            cartConfig={layout.cartConfig}
            popularProducts={layout.popularProducts}
          >
            <Header config={layout.header} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter config={layout.footer} />
          </OverlayProvider>
        </CustomerProvider>
        {layout.settings.theme.grain !== false && <div className="grain" aria-hidden />}
        {draft.isEnabled && <PreviewBar />}
      </body>
    </html>
  );
}
