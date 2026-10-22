import type { Metadata } from "next";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { ErrorHero } from "@/components/sections/ErrorHero";
import { MarqueeBand } from "@/components/home/MarqueeBand";
import { getSiteSettingsOrDefault, getTemplate } from "@/lib/api/content";
import type { TemplateData } from "@/lib/api/types";

export const metadata: Metadata = { title: "404" };

/** Built-in 404 used only when `template/404` cannot be loaded (API down / document missing). */
function FallbackNotFound() {
  return (
    <>
      <ErrorHero eyebrow="Error" code="404" />
      <MarqueeBand
        items={["PÁGINA NO ENCONTRADA", "404"]}
        duration={30}
        variant="plain"
        size="md"
        bordered
      />
      <CtaBanner
        text="Esta página no existe — o nunca la vieron."
        layout="split"
        ctaLabel="Volver al inicio"
        ctaHref="/"
        ctaVariant="solid"
        secondaryCtaLabel="Ver clothes"
        secondaryCtaHref="/collections/all"
        secondaryCtaVariant="outline"
      />
    </>
  );
}

/** On-brand 404 — rendered from `template/404` (error hero + ticker + CTA). */
export default async function NotFound() {
  let template: TemplateData | null = null;
  try {
    template = await getTemplate("404");
  } catch {
    template = null;
  }
  const settings = await getSiteSettingsOrDefault();

  return (
    <div data-testid="not-found-page" className="flex min-h-screen flex-col pt-[var(--chrome-h)]">
      {template && template.sections.length > 0 ? (
        <SectionRenderer sections={template.sections} ctx={{ settings }} />
      ) : (
        <FallbackNotFound />
      )}
    </div>
  );
}
