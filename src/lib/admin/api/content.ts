"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import type { Paged } from "@/lib/admin/query";

/* ------------------------------------------------------------------ */
/* Tipos (reflejan src/cms/** del backend)                             */
/* ------------------------------------------------------------------ */

export type ContentKind = "settings" | "menu" | "template" | "page";
export type VersionStatus = "published" | "scheduled" | "superseded" | "cancelled";

export interface DocListItem {
  id: string;
  kind: ContentKind;
  key: string;
  title: string | null;
  version: number;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  draftUpdatedAt: string;
}

export interface DocDetail {
  id: string;
  kind: ContentKind;
  key: string;
  title: string | null;
  version: number;
  draft: Record<string, unknown>;
  draftUpdatedAt: string;
  hasUnpublishedChanges: boolean;
  published: { versionId: string; number: number; publishedAt: string | null } | null;
  scheduled: Array<{ versionId: string; number: number; publishAt: string | null }>;
}

export interface VersionSummary {
  id: string;
  number: number;
  status: VersionStatus;
  publishAt: string | null;
  publishedAt: string | null;
  supersededAt: string | null;
  authorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface VersionDetail extends VersionSummary {
  data: Record<string, unknown>;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  minItems?: number;
  format?: string;
  description?: string;
}

export interface BlockTypeDescriptor {
  type: string;
  label: string;
  schema: JsonSchema;
}

export interface SectionTypeDescriptor {
  type: string;
  label: string;
  settingsSchema: JsonSchema;
  blockTypes: BlockTypeDescriptor[];
}

export interface BlockData {
  id: string;
  type: string;
  settings: Record<string, unknown>;
}

export interface SectionData {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  blocks?: BlockData[];
}

export type MenuLink = { type: "collection" | "product" | "page"; handle: string } | { type: "url"; url: string };

export interface MenuItemData {
  id: string;
  label: string;
  link: MenuLink;
  children?: MenuItemData[];
}

export interface PageDeleted {
  deleted: true;
  suggestedRedirect: { fromPath: string; toPath: string };
}

export interface PreviewToken {
  token: string;
  url: string;
  expiresAt: string;
}

/* ------------------------------------------------------------------ */
/* Claves de caché                                                     */
/* ------------------------------------------------------------------ */

export const contentKeys = {
  all: ["content"] as const,
  docs: (kind?: ContentKind) => ["content", "docs", kind ?? "all"] as const,
  doc: (kind: ContentKind, key: string) => ["content", "doc", kind, key] as const,
  versions: (kind: ContentKind, key: string, page: number) => ["content", "versions", kind, key, page] as const,
  version: (kind: ContentKind, key: string, id: string) => ["content", "version", kind, key, id] as const,
  sectionTypes: ["content", "section-types"] as const,
};

const docPath = (kind: ContentKind, key: string) => `/admin/content/documents/${kind}/${encodeURIComponent(key)}`;

/* ------------------------------------------------------------------ */
/* Lecturas                                                            */
/* ------------------------------------------------------------------ */

export function useDocuments(kind?: ContentKind): UseQueryResult<DocListItem[], ApiError> {
  return useQuery<DocListItem[], ApiError>({
    queryKey: contentKeys.docs(kind),
    queryFn: ({ signal }) => api.get<DocListItem[]>("/admin/content/documents", { query: { kind }, signal }),
  });
}

export function useDocument(kind: ContentKind, key: string): UseQueryResult<DocDetail, ApiError> {
  return useQuery<DocDetail, ApiError>({
    queryKey: contentKeys.doc(kind, key),
    queryFn: ({ signal }) => api.get<DocDetail>(docPath(kind, key), { signal }),
    // el borrador local manda: no refrescar en segundo plano mientras se edita
    staleTime: 60_000,
  });
}

export function useSectionTypes(): UseQueryResult<SectionTypeDescriptor[], ApiError> {
  return useQuery<SectionTypeDescriptor[], ApiError>({
    queryKey: contentKeys.sectionTypes,
    queryFn: ({ signal }) => api.get<SectionTypeDescriptor[]>("/admin/content/section-types", { signal }),
    staleTime: 10 * 60_000,
  });
}

export function useVersions(kind: ContentKind, key: string, page: number, enabled = true): UseQueryResult<Paged<VersionSummary>, ApiError> {
  return useQuery<Paged<VersionSummary>, ApiError>({
    queryKey: contentKeys.versions(kind, key, page),
    queryFn: ({ signal }) => api.get<Paged<VersionSummary>>(`${docPath(kind, key)}/versions`, { query: { page, pageSize: 15 }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useVersion(kind: ContentKind, key: string, versionId: string | null | undefined): UseQueryResult<VersionDetail, ApiError> {
  return useQuery<VersionDetail, ApiError>({
    queryKey: contentKeys.version(kind, key, versionId ?? "none"),
    queryFn: ({ signal }) => api.get<VersionDetail>(`${docPath(kind, key)}/versions/${versionId}`, { signal }),
    enabled: !!versionId,
    staleTime: 5 * 60_000,
  });
}

/* ------------------------------------------------------------------ */
/* Escrituras                                                          */
/* ------------------------------------------------------------------ */

/** Mutaciones de un documento: tras cada una se actualiza la caché del detalle y se invalidan listas/historial. */
export function useDocumentMutations(kind: ContentKind, key: string) {
  const qc = useQueryClient();
  const afterWrite = (detail?: DocDetail) => {
    if (detail) qc.setQueryData(contentKeys.doc(kind, key), detail);
    void qc.invalidateQueries({ queryKey: ["content", "docs"] });
    void qc.invalidateQueries({ queryKey: ["content", "versions", kind, key] });
    if (!detail) void qc.invalidateQueries({ queryKey: contentKeys.doc(kind, key) });
  };

  const saveDraft = useMutation<DocDetail, ApiError, { data: Record<string, unknown>; version: number; title?: string | null }>({
    mutationFn: ({ data, version, title }) =>
      api.put<DocDetail>(docPath(kind, key), { data, version, ...(title !== undefined ? { title } : {}) }, { headers: { "If-Match": String(version) } }),
    onSuccess: (d) => afterWrite(d),
  });

  const publish = useMutation<DocDetail, ApiError, { note?: string }>({
    mutationFn: ({ note }) => api.post<DocDetail>(`${docPath(kind, key)}/publish`, note ? { note } : {}),
    onSuccess: (d) => afterWrite(d),
  });

  const schedule = useMutation<VersionSummary, ApiError, { publishAt: string; note?: string }>({
    mutationFn: ({ publishAt, note }) => api.post<VersionSummary>(`${docPath(kind, key)}/schedule`, { publishAt, ...(note ? { note } : {}) }),
    onSuccess: () => afterWrite(),
  });

  const cancelSchedule = useMutation<void, ApiError, string>({
    mutationFn: (versionId) => api.delete<void>(`${docPath(kind, key)}/schedule/${versionId}`),
    onSuccess: () => afterWrite(),
  });

  const discard = useMutation<DocDetail, ApiError, void>({
    mutationFn: () => api.post<DocDetail>(`${docPath(kind, key)}/discard`, {}),
    onSuccess: (d) => afterWrite(d),
  });

  const restore = useMutation<DocDetail, ApiError, string>({
    mutationFn: (versionId) => api.post<DocDetail>(`${docPath(kind, key)}/versions/${versionId}/restore`, {}),
    onSuccess: (d) => afterWrite(d),
  });

  return { saveDraft, publish, schedule, cancelSchedule, discard, restore };
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation<DocDetail, ApiError, { handle: string; title: string; seoTitle?: string; seoDescription?: string }>({
    mutationFn: (input) => api.post<DocDetail>("/admin/content/pages", { ...input, sections: [] }),
    onSuccess: (d) => {
      qc.setQueryData(contentKeys.doc("page", d.key), d);
      void qc.invalidateQueries({ queryKey: ["content", "docs"] });
    },
  });
}

export function useCreateMenu() {
  const qc = useQueryClient();
  return useMutation<DocDetail, ApiError, { key: string; title: string }>({
    mutationFn: ({ key, title }) => api.put<DocDetail>(docPath("menu", key), { data: { items: [] }, title }),
    onSuccess: (d) => {
      qc.setQueryData(contentKeys.doc("menu", d.key), d);
      void qc.invalidateQueries({ queryKey: ["content", "docs"] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation<PageDeleted, ApiError, string>({
    mutationFn: (handle) => api.delete<PageDeleted>(docPath("page", handle)),
    onSuccess: (_r, handle) => {
      qc.removeQueries({ queryKey: contentKeys.doc("page", handle) });
      void qc.invalidateQueries({ queryKey: ["content", "docs"] });
    },
  });
}

export function createPreviewToken(kind: ContentKind, key: string): Promise<PreviewToken> {
  return api.post<PreviewToken>("/admin/content/preview-tokens", { kind, key });
}

/* ------------------------------------------------------------------ */
/* Opciones para selectores buscables (colecciones, productos, páginas) */
/* ------------------------------------------------------------------ */

export interface RefOption {
  value: string;
  label: string;
  hint?: string;
}

interface CollectionRow {
  id: string;
  handle: string;
  title: string;
}
interface ProductRow {
  id: string;
  handle: string;
  title: string;
  status?: string;
}

/** Todas las colecciones (el endpoint no tiene búsqueda: se filtra en el cliente). */
export function useCollectionOptions(enabled = true): UseQueryResult<RefOption[], ApiError> {
  return useQuery<RefOption[], ApiError>({
    queryKey: ["content", "ref", "collections"],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const res = await api.get<Paged<CollectionRow>>("/admin/collections", { query: { pageSize: 100 }, signal });
      return res.items.map((c) => ({ value: c.handle, label: c.title, hint: c.handle }));
    },
  });
}

export function useProductOptions(q: string, enabled = true): UseQueryResult<RefOption[], ApiError> {
  return useQuery<RefOption[], ApiError>({
    queryKey: ["content", "ref", "products", q],
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const res = await api.get<Paged<ProductRow>>("/admin/products", { query: { pageSize: 20, q: q || undefined }, signal });
      return res.items.map((p) => ({ value: p.handle, label: p.title, hint: p.handle }));
    },
  });
}

export function usePageOptions(enabled = true): UseQueryResult<RefOption[], ApiError> {
  return useQuery<RefOption[], ApiError>({
    queryKey: ["content", "ref", "pages"],
    enabled,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const res = await api.get<DocListItem[]>("/admin/content/documents", { query: { kind: "page" }, signal });
      return res.map((d) => ({ value: d.key, label: d.title ?? d.key, hint: d.key }));
    },
  });
}

export function useMenuOptions(enabled = true): UseQueryResult<RefOption[], ApiError> {
  return useQuery<RefOption[], ApiError>({
    queryKey: ["content", "ref", "menus"],
    enabled,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const res = await api.get<DocListItem[]>("/admin/content/documents", { query: { kind: "menu" }, signal });
      return res.map((d) => ({ value: d.key, label: d.title ?? d.key, hint: d.key }));
    },
  });
}
