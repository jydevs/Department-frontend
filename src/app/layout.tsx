import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Inter, Pinyon_Script } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreChrome } from "@/components/layout/StoreChrome";
import { OverlayProvider } from "@/components/layout/OverlayProvider";
import { SiteProvider } from "@/components/layout/SiteProvider";
import { getSite } from "@/lib/cms/site";
import { INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Fuentes de titulares/marquesinas: `optional` evita el salto de maquetación (CLS) cuando la fuente llega tarde y cambia
// el ancho del texto; next/font las precarga, así que en visitas normales ya están disponibles en el primer pintado.
const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "optional",
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "optional",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const pinyon = Pinyon_Script({
  weight: "400",
  variable: "--font-pinyon",
  subsets: ["latin"],
  display: "swap",
});

const BASE_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "es_CO", title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  // este sitio no se indexa salvo que se active explícitamente
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
};

/** Título y descripción por defecto editables desde el CMS (`settings/site.seo`). Reutiliza `getSite()` (sin petición extra). */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const seo = site.settings?.seo;
  const name = site.client.brandName;
  const description = seo?.defaultDescription ?? SITE_DESCRIPTION;
  const defaultTitle = seo?.defaultTitle ?? `${name} — ${site.client.tagline}`;
  return {
    ...BASE_METADATA,
    applicationName: name,
    title: { default: defaultTitle, template: seo?.titleTemplate ?? `%s — ${name}` },
    description,
    openGraph: { ...BASE_METADATA.openGraph, siteName: name, title: name, description },
    twitter: { ...BASE_METADATA.twitter, title: name, description },
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const THEME_VARS: Record<string, string> = {
  background: "--dept-black", foreground: "--dept-white", accent: "--dept-red", accentDark: "--dept-red-dark", accentLight: "--dept-red-light",
  info: "--dept-blue", gray100: "--dept-gray-100", gray300: "--dept-gray-300", gray500: "--dept-gray-500", gray900: "--dept-gray-900",
};

/** Colores del tema del CMS → variables CSS de la tienda (solo valores `#RRGGBB` validados). */
function themeCss(colors: Record<string, string> | undefined): string {
  const rules = Object.entries(colors ?? {}).flatMap(([k, v]) => (THEME_VARS[k] && HEX.test(v) ? [`${THEME_VARS[k]}:${v}`] : []));
  return rules.length ? `:root{${rules.join(";")}}` : "";
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  const css = themeCss(site.settings?.theme?.colors);
  return (
    <html
      lang="es"
      // Next desactiva el scroll suave de CSS en las transiciones de ruta salvo que se declare aquí
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${oswald.variable} ${inter.variable} ${pinyon.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-dept-black text-dept-white">
        {css && <style>{css}</style>}
        <SiteProvider value={site.client}>
          <OverlayProvider>
            <StoreChrome header={<Header />} footer={<SiteFooter site={site} />}>
              {children}
            </StoreChrome>
          </OverlayProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
