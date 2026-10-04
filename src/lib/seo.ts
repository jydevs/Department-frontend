import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

/** URL absoluta de una imagen: las rutas de la tienda ("/images/x.jpg") se completan con el origen; las URL completas se respetan. */
export const absoluteMedia = (url: string): string => (/^https?:\/\//i.test(url) ? url : absoluteUrl(url));

export interface PageSeo {
  /** título de la página (el layout le añade la plantilla del CMS: "%s — Marca") */
  title: string;
  description?: string;
  /** ruta canónica ("/collections/men") */
  path: string;
  /** imagen social con texto alternativo descriptivo; sin ella se usa la imagen por defecto de la tienda */
  image?: { url: string; alt: string };
  /** nombre de la marca y plantilla de título (`%s`) del CMS, para que og/twitter lleven el mismo título que `<title>` */
  brand?: string;
  titleTemplate?: string;
}

/** Título completo tal como lo verá el visitante (aplica la plantilla `%s — Marca` del CMS). */
function fullTitle(title: string, brand = SITE_NAME, template?: string): string {
  return (template ?? `%s — ${brand}`).replace("%s", title);
}

/** Metadatos propios de una página: título, descripción, canonical, Open Graph y Twitter coherentes entre sí. */
export function pageMetadata(o: PageSeo): Metadata {
  const brand = o.brand ?? SITE_NAME;
  const title = fullTitle(o.title, brand, o.titleTemplate);
  const description = o.description || SITE_DESCRIPTION;
  // sin imagen propia se usa la social por defecto de la tienda (`app/opengraph-image`), que al definir `openGraph` aquí no se hereda sola
  const image = o.image ?? { url: "/opengraph-image", alt: `${brand} — ${o.title}` };
  const images = [{ url: absoluteMedia(image.url), alt: image.alt }];
  return {
    title: o.title,
    description,
    alternates: { canonical: o.path },
    openGraph: { type: "website", siteName: brand, locale: "es_CO", url: o.path, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
