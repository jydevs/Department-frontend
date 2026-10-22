"use client";

import { useState } from "react";
import { Card, Input, TagInput } from "@/components/admin/ui";
import { LIMITS, useCatalogFacets, type ProductDetail, type UpdateProductInput } from "@/lib/admin/api/products";
import { RichTextEditor } from "./rich-text-editor";

export interface ProductDraft {
  title: string;
  descriptionHtml: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

export const EMPTY_DRAFT: ProductDraft = { title: "", descriptionHtml: "", handle: "", vendor: "", productType: "", tags: [], seoTitle: "", seoDescription: "" };

export function draftFromProduct(p: ProductDetail): ProductDraft {
  return {
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    handle: p.handle,
    vendor: p.vendor ?? "",
    productType: p.productType ?? "",
    tags: p.tags,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}

/** Solo los campos que cambiaron respecto al servidor (sin `version`). */
export function productPatch(d: ProductDraft, p: ProductDetail): Omit<UpdateProductInput, "version"> | null {
  const out: Omit<UpdateProductInput, "version"> = {};
  if (d.title.trim() !== p.title) out.title = d.title.trim();
  if (d.descriptionHtml !== p.descriptionHtml) out.descriptionHtml = d.descriptionHtml;
  if (d.handle.trim() !== p.handle && d.handle.trim()) out.handle = d.handle.trim();
  if ((d.vendor.trim() || null) !== p.vendor) out.vendor = d.vendor.trim() || null;
  if ((d.productType.trim() || null) !== p.productType) out.productType = d.productType.trim() || null;
  if (JSON.stringify(d.tags) !== JSON.stringify(p.tags)) out.tags = d.tags;
  if ((d.seoTitle.trim() || null) !== p.seoTitle) out.seoTitle = d.seoTitle.trim() || null;
  if ((d.seoDescription.trim() || null) !== p.seoDescription) out.seoDescription = d.seoDescription.trim() || null;
  return Object.keys(out).length ? out : null;
}

export function validateDraft(d: ProductDraft, requireHandleFormat = true): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.title.trim()) e.title = "El título es obligatorio.";
  else if (d.title.length > LIMITS.title) e.title = `Máximo ${LIMITS.title} caracteres.`;
  if (d.descriptionHtml.length > LIMITS.descriptionHtml) e.descriptionHtml = `Máximo ${LIMITS.descriptionHtml} caracteres.`;
  if (requireHandleFormat && d.handle.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.handle.trim())) e.handle = "Solo minúsculas, números y guiones (sin espacios ni tildes).";
  if (d.handle.length > LIMITS.handle) e.handle = `Máximo ${LIMITS.handle} caracteres.`;
  if (d.seoTitle.length > LIMITS.seoTitle) e.seoTitle = `Máximo ${LIMITS.seoTitle} caracteres.`;
  if (d.seoDescription.length > LIMITS.seoDescription) e.seoDescription = `Máximo ${LIMITS.seoDescription} caracteres.`;
  if (d.tags.length > LIMITS.maxTags) e.tags = `Máximo ${LIMITS.maxTags} etiquetas.`;
  return e;
}

export function InfoCard({ draft, set, errors }: { draft: ProductDraft; set: (patch: Partial<ProductDraft>) => void; errors: Record<string, string> }) {
  return (
    <Card title="Información">
      <div className="flex flex-col gap-4">
        <Input label="Título" required maxLength={LIMITS.title} value={draft.title} error={errors.title} placeholder="Camiseta básica" onChange={(e) => set({ title: e.target.value })} />
        <RichTextEditor value={draft.descriptionHtml} onChange={(v) => set({ descriptionHtml: v })} maxLength={LIMITS.descriptionHtml} error={errors.descriptionHtml} />
      </div>
    </Card>
  );
}

export function OrganizationCard({
  draft,
  set,
  errors,
  showHandle,
  handleHint,
}: {
  draft: ProductDraft;
  set: (patch: Partial<ProductDraft>) => void;
  errors: Record<string, string>;
  showHandle: boolean;
  handleHint?: string;
}) {
  // las sugerencias salen de los detalles de varios productos (el API no tiene facetas): se piden al primer foco
  const [armed, setArmed] = useState(false);
  const facets = useCatalogFacets(armed);
  return (
    <Card title="Organización">
      <div className="flex flex-col gap-4" onFocusCapture={() => setArmed(true)}>
        <Input label="Proveedor" maxLength={255} value={draft.vendor} list="dept-vendors" error={errors.vendor} onChange={(e) => set({ vendor: e.target.value })} />
        <datalist id="dept-vendors">
          {facets.vendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <Input label="Tipo de producto" maxLength={255} value={draft.productType} list="dept-types" error={errors.productType} onChange={(e) => set({ productType: e.target.value })} />
        <datalist id="dept-types">
          {facets.types.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <TagInput label="Etiquetas" value={draft.tags} suggestions={facets.tags} maxTags={LIMITS.maxTags} maxLength={LIMITS.tagLength} error={errors.tags} hint={`${draft.tags.length}/${LIMITS.maxTags}`} onChange={(tags) => set({ tags })} />
        {showHandle ? <Input label="Handle (URL)" maxLength={LIMITS.handle} value={draft.handle} error={errors.handle} hint={handleHint ?? "Cambiarlo cambia la dirección pública del producto."} onChange={(e) => set({ handle: e.target.value })} /> : null}
      </div>
    </Card>
  );
}
