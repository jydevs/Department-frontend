import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getTemplate } from "@/lib/cms/content";

/**
 * Home dirigida por el CMS (`template/home`): hero, marquesina, novedades, colecciones, campaña, manifiesto y valores.
 * Se edita en `/admin/content/templates/home`; publicar revalida la página (etiqueta `content:template:home`).
 */
export default async function HomePage() {
  const home = await getTemplate("home");
  return <SectionRenderer sections={home?.sections ?? []} />;
}
