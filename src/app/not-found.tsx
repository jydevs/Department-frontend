import type { Metadata } from "next";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { getTemplate } from "@/lib/cms/content";
import { FALLBACK_404 } from "@/lib/cms/fallback";

export const metadata: Metadata = { title: "404" };

/** 404 de marca: plantilla `404` del CMS (cabecera de error + marquesina + llamada a la acción). */
export default async function NotFound() {
  const tpl = await getTemplate("404").catch(() => null);
  return (
    <div data-testid="not-found-page" className="flex min-h-screen flex-col">
      <SectionRenderer sections={tpl?.sections ?? FALLBACK_404} />
    </div>
  );
}
