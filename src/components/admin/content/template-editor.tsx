"use client";

import { useProductOptions } from "@/lib/admin/api/content";
import { previewPathFor } from "./content-utils";
import { SectionWorkspace } from "./section-workspace";
import { TEMPLATE_META, templateLabel } from "./section-meta";

export function TemplateEditor({ templateKey }: { templateKey: string }) {
  // la plantilla de producto se previsualiza con un producto real
  const products = useProductOptions("", templateKey === "product");
  const path = previewPathFor("template", templateKey, products.data?.[0]?.value);
  return (
    <SectionWorkspace
      kind="template"
      docKey={templateKey}
      title={`Plantilla: ${templateLabel(templateKey)}`}
      description={TEMPLATE_META[templateKey]?.description}
      breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Plantillas", href: "/content/templates" }, { label: templateLabel(templateKey) }]}
      previewPath={path}
    />
  );
}
