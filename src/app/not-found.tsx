import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_404 } from "@/lib/cms/fallback";
import type { TemplateData } from "@/lib/cms/types";

export const metadata: Metadata = { title: "Página no encontrada" };

/** 404 de marca: plantilla `404` del CMS (cabecera de error + marquesina + llamada a la acción). */
export default async function NotFound() {
  // una página de error no debe fallar por la API: si la plantilla no se puede leer se usa la mínima
  let tpl: TemplateData | null = null;
  try {
    tpl = await getTemplate("404");
  } catch (e) {
    unstable_rethrow(e);
  }
  return (
    <div data-testid="not-found-page" className="flex min-h-[70svh] flex-col">
      <SectionRenderer sections={tpl?.sections ?? FALLBACK_404} />
    </div>
  );
}
