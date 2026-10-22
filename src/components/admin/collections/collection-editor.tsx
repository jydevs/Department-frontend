"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, ImagePlus, Trash2, X } from "lucide-react";
import { Badge, Button, Card, ErrorState, Input, NoAccess, PageHeader, Select, Skeleton, Switch, useConfirm, useToast } from "@/components/admin/ui";
import { MediaPickerSlot, type MediaPickerItem } from "@/components/admin/products/media-picker-slot";
import { MetafieldsEditor, changedRows, removedKeys, rowsFromServer, validateRows, type MetaRow } from "@/components/admin/products/metafields-editor";
import { Thumb } from "@/components/admin/products/product-image";
import { RichTextEditor } from "@/components/admin/products/rich-text-editor";
import { SeoCard } from "@/components/admin/products/seo-card";
import { useUnsavedGuard } from "@/components/admin/products/use-unsaved-guard";
import {
  SORT_LABELS,
  collectionsApi,
  useCollectionProducts,
  normalizeRules,
  useCollection,
  type Collection,
  type CollectionMember,
  type CollectionRules,
  type CollectionSort,
  type CollectionType,
} from "@/lib/admin/api/collections";
import { productsApi, useMetafields, type Metafield } from "@/lib/admin/api/products";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { slugify } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { STOREFRONT_URL } from "@/lib/admin/utils";
import { ManualProducts } from "./manual-products";
import { EMPTY_RULES, RulesBuilder, rulesError } from "./rules-builder";

interface CDraft {
  title: string;
  handle: string;
  descriptionHtml: string;
  type: CollectionType;
  sortOrder: CollectionSort;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  imageMediaId: string | null;
  imageUrl: string | null;
}

const NEW_DRAFT: CDraft = { title: "", handle: "", descriptionHtml: "", type: "manual", sortOrder: "manual", isPublished: false, seoTitle: "", seoDescription: "", imageMediaId: null, imageUrl: null };

function draftFrom(c: Collection, imageUrl: string | null): CDraft {
  return {
    title: c.title,
    handle: c.handle,
    descriptionHtml: c.descriptionHtml,
    type: c.type,
    sortOrder: c.sortOrder,
    isPublished: c.isPublished,
    seoTitle: c.seoTitle ?? "",
    seoDescription: c.seoDescription ?? "",
    imageMediaId: c.imageMediaId,
    imageUrl,
  };
}

const CODE_ERRORS: Record<string, [string, string]> = {
  HANDLE_TAKEN: ["handle", "Ese handle ya lo usa otra colección."],
  RULES_REQUIRED: ["rules", "Las colecciones inteligentes necesitan reglas."],
};

/* ------------------------------ carga ------------------------------ */

export function CollectionEditor({ id }: { id?: string }) {
  const canRead = useCan("collections:read");
  const canWrite = useCan("collections:write");
  const q = useCollection(id, canRead);
  const [rev, setRev] = useState(0);
  if (!canRead) return <NoAccess permission="collections:read" />;
  if (!id) return canWrite ? <CollectionBody key="new" collection={null} reload={async () => {}} reset={() => {}} /> : <NoAccess permission="collections:write" />;
  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <CollectionBody key={`${id}:${rev}`} collection={q.data} reload={async () => { await q.refetch(); }} reset={() => setRev((r) => r + 1)} />;
}

/* ------------------------------ cuerpo ------------------------------ */

function CollectionBody({ collection, reload, reset }: { collection: Collection | null; reload: () => Promise<void>; reset: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const canWrite = useCan("collections:write");
  const isNew = collection === null;
  const membersQ = useCollectionProducts(collection?.id, collection?.type === "manual");
  const meta = useMetafields("collections", collection?.id);

  const [draft, setDraft] = useState<CDraft>(() => (collection ? draftFrom(collection, null) : NEW_DRAFT));
  const [handleTouched, setHandleTouched] = useState(!isNew);
  const [rules, setRules] = useState<CollectionRules>(() => (collection?.rules ? (collection.rules as CollectionRules) : EMPTY_RULES));
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [membersSeen, setMembersSeen] = useState<CollectionMember[] | undefined>();
  const [membersEdited, setMembersEdited] = useState(false);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const [metaSeen, setMetaSeen] = useState<{ metafields: Metafield[] } | undefined>();
  const [metaErrors, setMetaErrors] = useState<Record<string, { key?: string; value?: string }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [mediaPickedUrl, setMediaPickedUrl] = useState<string | null>(null);

  // miembros de una colección manual: se cargan del servidor mientras el usuario no haya reordenado nada
  if (membersQ.data && membersQ.data !== membersSeen) {
    setMembersSeen(membersQ.data);
    if (!membersEdited) setMembers(membersQ.data);
  }
  const membersKnown = isNew || collection?.type !== "manual" || membersQ.isSuccess;

  if (meta.data && meta.data !== metaSeen) {
    setMetaSeen(meta.data);
    const server = rowsFromServer(meta.data.metafields);
    setMetaRows((prev) => [...server, ...prev.filter((r) => !r.existing && r.key.trim() && !server.some((s) => s.key === r.key))]);
  }

  const imageUrl = draft.imageUrl ?? mediaPickedUrl ?? (draft.imageMediaId && draft.imageMediaId === collection?.imageMediaId ? collection.image?.url ?? null : null);
  const base = collection ? draftFrom(collection, null) : NEW_DRAFT;
  const sig = (d: CDraft) => JSON.stringify({ ...d, imageUrl: null, title: d.title.trim(), handle: d.handle.trim() });
  const rulesSig = (r: CollectionRules | null) => JSON.stringify(r ? normalizeRules(r) : null);
  const draftDirty = sig(draft) !== sig(base);
  const rulesDirty = draft.type === "smart" && rulesSig(rules) !== rulesSig((collection?.rules as CollectionRules | null) ?? (isNew ? EMPTY_RULES : null));
  const metaDirty = meta.data ? changedRows(metaRows, meta.data.metafields).length > 0 || removedKeys(metaRows, meta.data.metafields).length > 0 : metaRows.some((r) => r.key.trim() && r.value);
  const dirty = (isNew ? draft.title.trim() !== "" || draftDirty : draftDirty) || rulesDirty || membersEdited || metaDirty;
  const guard = useUnsavedGuard(dirty && !saving);

  const patch = (p: Partial<CDraft>) => setDraft((d) => ({ ...d, ...p }));
  const publicUrl = `${STOREFRONT_URL}/collections/${collection?.handle ?? draft.handle}`;

  const applyError = (e: unknown) => {
    if (e instanceof ApiError) {
      const mapped = CODE_ERRORS[e.code];
      if (mapped) {
        setErrors((prev) => ({ ...prev, [mapped[0]]: mapped[1] }));
        return;
      }
      const fe = e.fieldErrors();
      if (e.code === "VALIDATION_ERROR" && Object.keys(fe).length) {
        setErrors((prev) => ({ ...prev, ...fe }));
        setFormError(errorMessage(e));
        return;
      }
    }
    setFormError(errorMessage(e));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = "El título es obligatorio.";
    const handle = draft.handle.trim() || slugify(draft.title);
    if (!handle) e.handle = "El handle es obligatorio.";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle) || handle.length > 120) e.handle = "Solo minúsculas, números y guiones (máx. 120).";
    if (draft.descriptionHtml.length > 5000) e.descriptionHtml = "Máximo 5000 caracteres.";
    if (draft.seoTitle.length > 255) e.seoTitle = "Máximo 255 caracteres.";
    if (draft.seoDescription.length > 500) e.seoDescription = "Máximo 500 caracteres.";
    if (draft.type === "smart") {
      const r = rulesError(rules);
      if (r) e.rules = r;
    }
    return e;
  };

  const save = async () => {
    setFormError(null);
    const e = validate();
    const mErr = validateRows(metaRows);
    setErrors(e);
    setMetaErrors(mErr);
    if (Object.keys(e).length || Object.keys(mErr).length) {
      toast.error("Revisa los campos marcados antes de guardar.");
      return;
    }
    if (!isNew && membersEdited && !membersKnown) {
      const ok = await confirm({
        title: "Reemplazar la lista de productos",
        description: "No se pudo leer la lista actual de esta colección. Al guardar se reemplazará por los productos que ves aquí.",
        confirmLabel: "Reemplazar y guardar",
        tone: "danger",
      });
      if (!ok) return;
    }
    setSaving(true);
    const handle = draft.handle.trim() || slugify(draft.title);
    try {
      let id = collection?.id ?? "";
      if (isNew) {
        const created = await collectionsApi.create({
          handle,
          title: draft.title.trim(),
          descriptionHtml: draft.descriptionHtml,
          type: draft.type,
          rules: draft.type === "smart" ? normalizeRules(rules) : null,
          sortOrder: draft.sortOrder,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          imageMediaId: draft.imageMediaId,
          isPublished: draft.isPublished,
        });
        id = created.id;
      } else if (draftDirty || rulesDirty) {
        await collectionsApi.update(id, {
          handle,
          title: draft.title.trim(),
          descriptionHtml: draft.descriptionHtml,
          sortOrder: draft.sortOrder,
          isPublished: draft.isPublished,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          imageMediaId: draft.imageMediaId,
          version: collection?.version,
          ...(draft.type === "smart" ? { rules: normalizeRules(rules) } : {}),
        });
      }
      const warnings: string[] = [];
      if (draft.type === "manual" && membersEdited) {
        try {
          await collectionsApi.setProducts(id, members.map((m) => m.id));
        } catch (err) {
          warnings.push(`los productos no se guardaron (${errorMessage(err)})`);
        }
      }
      const changed = isNew ? metaRows.filter((r) => r.key.trim()).map((r) => ({ namespace: "custom", key: r.key.trim(), type: r.type, value: r.value })) : meta.data ? changedRows(metaRows, meta.data.metafields) : [];
      const removed = !isNew && meta.data ? removedKeys(metaRows, meta.data.metafields) : [];
      if (changed.length || removed.length) {
        try {
          if (changed.length) await productsApi.putMetafields("collections", id, changed);
          for (const key of removed) await productsApi.deleteMetafield("collections", id, "custom", key);
        } catch (err) {
          warnings.push(`los metafields no se guardaron (${errorMessage(err)})`);
        }
      }
      await qc.invalidateQueries({ queryKey: ["collections"] });
      if (warnings.length) toast.warning(`Guardado, pero ${warnings.join("; ")}.`);
      else toast.success(isNew ? "Colección creada." : "Cambios guardados.");
      if (isNew) {
        guard.leave(`/collections/${id}`);
        return;
      }
      await reload();
      if (!warnings.length) reset();
    } catch (err) {
      applyError(err);
      toast.error(err instanceof ApiError && CODE_ERRORS[err.code] ? CODE_ERRORS[err.code][1] : errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!collection) return;
    const ok = await confirm({ title: `¿Eliminar «${collection.title}»?`, description: "Dejará de mostrarse en la tienda. Los productos no se eliminan.", confirmLabel: "Eliminar colección", tone: "danger" });
    if (!ok) return;
    setBusy(true);
    try {
      await collectionsApi.remove(collection.id);
      await qc.invalidateQueries({ queryKey: ["collections", "list"] });
      toast.success("Colección eliminada.");
      guard.leave("/collections");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };

  const discard = async () => {
    const ok = await confirm({ title: "¿Descartar los cambios?", description: "Se restaurarán los valores guardados.", confirmLabel: "Descartar", tone: "danger" });
    if (ok) reset();
  };

  const pickImage = (items: MediaPickerItem[]) => {
    setPicking(false);
    const it = items[0];
    if (!it) return;
    setMediaPickedUrl(it.url);
    patch({ imageMediaId: it.id, imageUrl: it.url });
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Colecciones", href: "/collections" }, { label: isNew ? "Nueva colección" : collection.title }]}
        title={isNew ? "Nueva colección" : collection.title}
        meta={isNew ? undefined : <Badge tone={collection.isPublished ? "success" : "neutral"} dot>{collection.isPublished ? "Publicada" : "Oculta"}</Badge>}
        actions={
          canWrite ? (
            <>
              {!isNew ? (
                <Button disabled={!dirty || saving} onClick={() => void discard()}>
                  Descartar
                </Button>
              ) : null}
              <Button variant="primary" loading={saving} disabled={!isNew && !dirty} onClick={() => void save()}>
                {isNew ? "Crear colección" : "Guardar cambios"}
              </Button>
            </>
          ) : null
        }
      />
      {formError ? (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle aria-hidden size={16} /> {formError}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={!canWrite} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
          <Card title="Información">
            <div className="flex flex-col gap-4">
              <Input
                label="Título"
                required
                maxLength={255}
                value={draft.title}
                error={errors.title}
                onChange={(e) => {
                  const title = e.target.value;
                  patch({ title, ...(isNew && !handleTouched ? { handle: slugify(title) } : {}) });
                }}
              />
              <RichTextEditor value={draft.descriptionHtml} onChange={(v) => patch({ descriptionHtml: v })} maxLength={5000} error={errors.descriptionHtml} rows={7} />
            </div>
          </Card>

          {draft.type === "manual" ? (
            <ManualProducts
              members={members}
              known={membersKnown}
              edited={membersEdited}
              readOnly={!canWrite}
              onChange={(m) => {
                setMembers(m);
                setMembersEdited(true);
              }}
            />
          ) : (
            <>
              {errors.rules ? (
                <p role="alert" className="text-sm text-danger">
                  {errors.rules}
                </p>
              ) : null}
              <RulesBuilder rules={rules} onChange={setRules} readOnly={!canWrite} />
            </>
          )}

          <MetafieldsEditor rows={metaRows} onChange={setMetaRows} readOnly={!canWrite} loading={!isNew && meta.isLoading} errors={metaErrors} />
          <SeoCard
            seoTitle={draft.seoTitle}
            seoDescription={draft.seoDescription}
            onSeoTitle={(v) => patch({ seoTitle: v })}
            onSeoDescription={(v) => patch({ seoDescription: v })}
            fallbackTitle={draft.title}
            fallbackDescription=""
            path={`/collections/${draft.handle || "handle"}`}
            maxTitle={255}
            maxDescription={500}
            errors={errors}
          />
        </fieldset>

        <fieldset disabled={!canWrite} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 lg:sticky lg:top-4">
          <Card title="Publicación">
            <div className="flex flex-col gap-3">
              <Switch checked={draft.isPublished} onChange={(v) => patch({ isPublished: v })} label={draft.isPublished ? "Visible en la tienda" : "Oculta en la tienda"} hint="Se aplica al guardar." />
              {!isNew && collection.isPublished ? (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-info hover:underline">
                  Ver en la tienda <ExternalLink aria-hidden size={13} />
                </a>
              ) : null}
            </div>
          </Card>
          <Card title="Tipo y orden">
            <div className="flex flex-col gap-4">
              {isNew ? (
                <Select label="Tipo de colección" value={draft.type} onChange={(e) => patch({ type: e.target.value === "smart" ? "smart" : "manual", sortOrder: e.target.value === "smart" && draft.sortOrder === "manual" ? "newest" : draft.sortOrder })}>
                  <option value="manual">Manual (eliges los productos)</option>
                  <option value="smart">Inteligente (por reglas)</option>
                </Select>
              ) : (
                <p className="text-sm">
                  Tipo: <Badge tone="info">{draft.type === "manual" ? "Manual" : "Inteligente"}</Badge>
                  <span className="mt-1 block text-xs text-muted">El tipo no se cambia después de crearla.</span>
                </p>
              )}
              <Select label="Orden de los productos" value={draft.sortOrder} onChange={(e) => patch({ sortOrder: e.target.value as CollectionSort })}>
                {(Object.keys(SORT_LABELS) as CollectionSort[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </Select>
              <Input
                label="Handle (URL)"
                maxLength={120}
                value={draft.handle}
                error={errors.handle}
                hint={`/collections/${draft.handle || "handle"}`}
                onChange={(e) => {
                  setHandleTouched(true);
                  patch({ handle: e.target.value });
                }}
              />
            </div>
          </Card>
          <Card title="Imagen">
            <div className="flex flex-col items-start gap-3">
              {draft.imageMediaId ? (
                <>
                  <Thumb url={imageUrl} size={160} className="aspect-video !h-auto !w-full" />
                  <Button size="sm" variant="ghost" leftIcon={<X aria-hidden size={14} />} onClick={() => patch({ imageMediaId: null, imageUrl: null })}>
                    Quitar imagen
                  </Button>
                </>
              ) : null}
              <Button size="sm" leftIcon={<ImagePlus aria-hidden size={14} />} onClick={() => setPicking(true)}>
                {draft.imageMediaId ? "Cambiar imagen" : "Elegir imagen"}
              </Button>
            </div>
          </Card>
          {!isNew && canWrite ? (
            <Button variant="danger" loading={busy} leftIcon={<Trash2 aria-hidden size={15} />} onClick={() => void remove()}>
              Eliminar colección
            </Button>
          ) : null}
        </fieldset>
      </div>
      <MediaPickerSlot open={picking} onClose={() => setPicking(false)} onSelect={pickImage} multiple={false} />
    </>
  );
}
