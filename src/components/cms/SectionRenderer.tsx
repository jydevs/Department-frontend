import { Fragment } from "react";
import type { SectionEnvelope } from "@/lib/api/types";
import { SECTION_REGISTRY, type RenderContext } from "@/lib/cms/registry";

interface SectionRendererProps {
  sections: SectionEnvelope[];
  ctx: RenderContext;
}

/**
 * Renders a template / page: walks its sections in order and mounts the component registered for each `type`
 * (see lib/cms/registry.tsx). Sections with `enabled: false` and unknown types are skipped. A section that
 * fails to render (bad data) is skipped too, so one broken block never takes the whole page down.
 */
export async function SectionRenderer({ sections, ctx }: SectionRendererProps) {
  const active = sections.filter((s) => s.enabled !== false && Object.hasOwn(SECTION_REGISTRY, s.type));

  const nodes = await Promise.all(
    active.map(async (section, index) => {
      try {
        return await SECTION_REGISTRY[section.type](section, ctx, index);
      } catch (err) {
        console.error(`[cms] section "${section.id}" (${section.type}) failed to render`, err);
        return null;
      }
    }),
  );

  return (
    <>
      {active.map((section, i) => (
        <Fragment key={section.id}>{nodes[i]}</Fragment>
      ))}
    </>
  );
}
