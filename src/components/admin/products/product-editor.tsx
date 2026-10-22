"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Copy, ExternalLink, Trash2, Upload } from "lucide-react";
import { Button, Card, ConfirmDialog, ErrorState, NoAccess, PageHeader, Skeleton, StatusBadge, useConfirm, useToast } from "@/components/admin/ui";
import { api } from "@/lib/admin/api-client";
import {
  LIMITS,
  productsApi,
  useMetafields,
  useProduct,
  type MediaInput,
  type Metafield,
  type ProductDetail,
} from "@/lib/admin/api/products";
import { ApiError, errorMessage, isConcurrentUpdate } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { STOREFRONT_URL } from "@/lib/admin/utils";
import { ProductInventoryCard } from "./inventory-card";
import { MediaCard, newMediaKey, type MediaDraft } from "./media-card";
import { MetafieldsEditor, changedRows, removedKeys, rowsFromServer, validateRows, type MetaRow } from "./metafields-editor";
import { OptionsEditor, draftsFromOptions, draftsToInput, validateOptions, type OptionDraft } from "./options-editor";
import { InfoCard, OrganizationCard, draftFromProduct, productPatch, validateDraft, type ProductDraft } from "./product-form-parts";
import { SeoCard } from "./seo-card";
import { useUnsavedGuard } from "./use-unsaved-guard";
import { VariantsCard, reconcileRows, rowFromVariant, validateRow, variantChanges, type RowErrors, type VariantRow } from "./variants-card";

/* ------------------------------ carga + remonte ------------------------------ */

export function ProductEditor({ id }: { id: string }) {
  const canRead = useCan("products:read");
  const q = useProduct(id, canRead);
  const [rev, setRev] = useState(0);
  if (!canRead) return <NoAccess permission="products:read" />;
  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <EditBody key={`${id}:${rev}`} product={q.data} reload={async () => { await q.refetch(); }} reset={() => setRev((r) => r + 1)} />;
}

function mediaFrom(p: ProductDetail): MediaDraft[] {
  return p.media.map((m) => ({ key: newMediaKey(), url: m.url, alt: m.alt ?? "", baseAlt: m.alt ?? "", id: m.id }));
}

const mediaSig = (m: MediaDraft[]) => JSON.stringify(m.map((x) => [x.url, x.alt]));

/* ------------------------------ cuerpo ------------------------------ */

function EditBody({ product, reload, reset }: { product: ProductDetail; reload: () => Promise<void>; reset: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const canWrite = useCan("products:write");
  const canMediaWrite = useCan("media:write");
  const meta = useMetafields("products", product.id);

  const [draft, setDraft] = useState<ProductDraft>(() => draftFromProduct(product));
  const [media, setMedia] = useState<MediaDraft[]>(() => mediaFrom(product));
  const [rows, setRows] = useState<VariantRow[]>(() => product.variants.map(rowFromVariant));
  const [optDrafts, setOptDrafts] = useState<OptionDraft[]>(() => draftsFromOptions(product.options));
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const [metaSeen, setMetaSeen] = useState<{ metafields: Metafield[] } | undefined>();
  const [seenProduct, setSeenProduct] = useState(product);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});
  const [metaErrors, setMetaErrors] = useState<Record<string, { key?: string; value?: string }>>({});
  const [optError, setOptError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forceInfo, setForceInfo] = useState<{ variants: Array<{ id: string; title: string }>; removed: Array<{ id: string; label?: string }> } | null>(null);

  // sincroniza altas/bajas de variantes y opciones cuando el servidor cambia, sin perder lo editado
  if (product !== seenProduct) {
    setSeenProduct(product);
    setRows((prev) => reconcileRows(prev, product.variants));
    setOptDrafts((prev) => (JSON.stringify(prev) === JSON.stringify(draftsFromOptions(seenProduct.options)) ? draftsFromOptions(product.options) : prev));
  }
  // metafields: reconstruye con lo del servidor y conserva las filas nuevas aún sin guardar
  if (meta.data && meta.data !== metaSeen) {
    setMetaSeen(meta.data);
    const server = rowsFromServer(meta.data.metafields);
    setMetaRows((prev) => [...server, ...prev.filter((r) => !r.existing && r.key.trim() && !server.some((s) => s.key === r.key))]);
  }

  const productDirty = productPatch(draft, product) !== null;
  const mediaDirty = mediaSig(media) !== mediaSig(mediaFrom(product));
  const variantDirty = rows.some((r) => {
    const b = product.variants.find((v) => v.id === r.id);
    return b ? variantChanges(r, b) !== null : false;
  });
  const metaDirty = meta.data ? changedRows(metaRows, meta.data.metafields).length > 0 || removedKeys(metaRows, meta.data.metafields).length > 0 : false;
  const optionsDirty = JSON.stringify(optDrafts.map((o) => [o.name.trim(), o.values])) !== JSON.stringify(draftsFromOptions(product.options).map((o) => [o.name, o.values]));
  const dirty = productDirty || mediaDirty || variantDirty || metaDirty;
  const guard = useUnsavedGuard(dirty || optionsDirty);

  const patchDraft = (p: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...p }));
  const storeUrl = `${STOREFRONT_URL}/products/${product.handle}`;
  const hasPublishable = product.variants.some((v) => v.isActive && v.price > 0);

  const handleError = (e: unknown, scope: "product" | "media" | "meta" | "other") => {
    if (isConcurrentUpdate(e)) {
      setConflict(true);
      return;
    }
    if (e instanceof ApiError) {
      const fe = e.fieldErrors();
      if (e.code === "VALIDATION_ERROR" && Object.keys(fe).length) {
        setErrors((prev) => ({ ...prev, ...fe }));
        setFormError(errorMessage(e));
        return;
      }
      if (e.code === "CONFLICT" && /handle/i.test(e.message)) {
        setErrors((prev) => ({ ...prev, handle: "Ese handle ya está en uso por otro producto." }));
        return;
      }
      if (scope === "media") {
        setMediaError(errorMessage(e));
        return;
      }
    }
    setFormError(errorMessage(e));
  };

  const variantErrorFor = (e: unknown): RowErrors => {
    if (e instanceof ApiError) {
      if (e.code === "SKU_TAKEN") return { sku: "Ese SKU ya está en uso." };
      if (e.code === "INVENTORY_POLICY_LOCKED") return { row: "Hay stock reservado: cambia el seguimiento o el backorder cuando se resuelvan esos pedidos." };
      if (e.code === "CONFLICT" && /last active variant/i.test(e.message)) return { row: "No puedes desactivar la última variante activa de un producto publicado." };
      if (e.code === "BAD_REQUEST" && /compareAtPrice/i.test(e.message)) return { compareAtPrice: "Debe ser mayor o igual al precio." };
      const fe = e.fieldErrors();
      if (Object.keys(fe).length) return { row: Object.values(fe)[0] };
    }
    return { row: errorMessage(e) };
  };

  const save = async () => {
    setFormError(null);
    setMediaError(null);
    const dErrors = validateDraft(draft);
    const rErrors: Record<string, RowErrors> = {};
    for (const r of rows) {
      const e = validateRow(r);
      if (Object.keys(e).length) rErrors[r.id] = e;
    }
    const mErrors = validateRows(metaRows);
    setErrors(dErrors);
    setRowErrors(rErrors);
    setMetaErrors(mErrors);
    if (Object.keys(dErrors).length || Object.keys(rErrors).length || Object.keys(mErrors).length) {
      toast.error("Revisa los campos marcados antes de guardar.");
      return;
    }
    setSaving(true);
    let ok = true;
    const nextRowErrors: Record<string, RowErrors> = {};

    const patch = productPatch(draft, product);
    if (patch) {
      try {
        await productsApi.update(product.id, { ...patch, version: product.version });
      } catch (e) {
        ok = false;
        handleError(e, "product");
      }
    }

    if (mediaDirty) {
      try {
        if (canMediaWrite) {
          for (const m of media) {
            if (m.id && m.alt !== m.baseAlt) await api.patch(`/admin/media/${m.id}`, { alt: m.alt.trim() === "" ? null : m.alt.trim() });
          }
        }
        const body: MediaInput[] = media.map((m) => ({ url: m.url, alt: m.alt.trim() === "" ? null : m.alt.trim() }));
        await productsApi.updateMedia(product.id, body);
      } catch (e) {
        ok = false;
        handleError(e, "media");
      }
    }

    for (const r of rows) {
      const base = product.variants.find((v) => v.id === r.id);
      const changes = base ? variantChanges(r, base) : null;
      if (!base || !changes) continue;
      try {
        await productsApi.updateVariant(product.id, r.id, { ...changes, version: base.version });
      } catch (e) {
        ok = false;
        nextRowErrors[r.id] = variantErrorFor(e);
      }
    }
    setRowErrors(nextRowErrors);

    if (meta.data) {
      const changed = changedRows(metaRows, meta.data.metafields);
      const removed = removedKeys(metaRows, meta.data.metafields);
      if (changed.length || removed.length) {
        try {
          if (changed.length) await productsApi.putMetafields("products", product.id, changed);
          for (const key of removed) await productsApi.deleteMetafield("products", product.id, "custom", key);
          await qc.invalidateQueries({ queryKey: ["products", "metafields", product.id] });
        } catch (e) {
          ok = false;
          handleError(e, "meta");
        }
      }
    }

    await qc.invalidateQueries({ queryKey: ["products"] });
    await reload();
    setSaving(false);
    if (ok) {
      toast.success("Cambios guardados.");
      reset();
    } else {
      toast.error("Algunos cambios no se pudieron guardar. Revisa los avisos.");
    }
  };

  const discard = async () => {
    if (dirty || optionsDirty) {
      const ok = await confirm({ title: "¿Descartar los cambios?", description: "Se restaurarán los valores guardados.", confirmLabel: "Descartar", tone: "danger" });
      if (!ok) return;
    }
    setErrors({});
    setRowErrors({});
    setFormError(null);
    reset();
  };

  /* ---- acciones de estado ---- */

  const reloadAll = async () => {
    await qc.invalidateQueries({ queryKey: ["products"] });
    await reload();
  };

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await reloadAll();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (dirty) {
      toast.warning("Guarda los cambios antes de publicar.");
      return;
    }
    await runAction(() => productsApi.publish(product.id), "Producto publicado.");
  };

  const archive = async () => {
    if (dirty) {
      toast.warning("Guarda los cambios antes de archivar.");
      return;
    }
    const ok = await confirm({ title: "¿Archivar este producto?", description: product.status === "active" ? "Dejará de mostrarse en la tienda. Puedes volver a publicarlo cuando quieras." : undefined, confirmLabel: "Archivar" });
    if (ok) await runAction(() => productsApi.archive(product.id), "Producto archivado.");
  };

  const duplicate = async () => {
    if (dirty) {
      toast.warning("Guarda los cambios antes de duplicar.");
      return;
    }
    setBusy(true);
    try {
      const copy = await productsApi.duplicate(product.id);
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto duplicado como borrador (sin SKU, hay que asignarlos).");
      guard.leave(`/products/${copy.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `¿Eliminar «${product.title}»?`,
      description: "Dejará de mostrarse en la tienda, se quitará de las colecciones manuales y se liberarán sus SKU.",
      confirmLabel: "Eliminar producto",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await productsApi.remove(product.id);
      // solo la lista: invalidar el detalle borrado lo volvería a pedir (404) antes de salir
      await qc.invalidateQueries({ queryKey: ["products", "list"] });
      toast.success("Producto eliminado.");
      guard.leave("/products");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };

  /* ---- opciones (reconciliación) ---- */

  const applyOptions = async (force: boolean) => {
    const err = validateOptions(optDrafts);
    setOptError(err);
    if (err) return;
    if (dirty) {
      toast.warning("Guarda primero los demás cambios: aplicar opciones recarga las variantes.");
      return;
    }
    setBusy(true);
    try {
      await productsApi.updateOptions(product.id, draftsToInput(optDrafts), force);
      toast.success("Opciones actualizadas.");
      setForceInfo(null);
      await reloadAll();
      reset();
    } catch (e) {
      if (e instanceof ApiError && e.code === "OPTION_VALUES_IN_USE") {
        const d = (e.details ?? {}) as { variants?: Array<{ id: string; title: string }>; removedValues?: Array<{ id: string; label?: string }> };
        setForceInfo({ variants: d.variants ?? [], removed: d.removedValues ?? [] });
      } else if (e instanceof ApiError && e.code === "LAST_ACTIVE_VARIANT") {
        setForceInfo(null);
        setOptError("Este cambio dejaría el producto publicado sin variantes activas. Archívalo primero o conserva algún valor en uso.");
      } else {
        setForceInfo(null);
        setOptError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const readOnly = !canWrite;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Productos", href: "/products" }, { label: product.title }]}
        title={product.title}
        meta={<StatusBadge status={product.status} />}
        description={`Actualizado ${formatDateTime(product.updatedAt)}`}
        actions={
          canWrite ? (
            <>
              <Button disabled={!dirty || saving} onClick={() => void discard()}>
                Descartar
              </Button>
              <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>
                Guardar cambios
              </Button>
            </>
          ) : null
        }
      />

      {readOnly ? (
        <p role="status" className="mb-4 rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          Solo lectura: tu rol no incluye el permiso products:write.
        </p>
      ) : null}
      {conflict ? (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-danger">
            <AlertTriangle aria-hidden size={16} /> Alguien más editó este producto mientras trabajabas. Recarga para ver los cambios más recientes (perderás lo que no guardaste).
          </span>
          <Button
            size="sm"
            onClick={() => {
              setConflict(false);
              void reloadAll().then(reset);
            }}
          >
            Recargar
          </Button>
        </div>
      ) : null}
      {formError ? (
        <p role="alert" className="mb-4 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            <InfoCard draft={draft} set={patchDraft} errors={errors} />
            <MediaCard items={media} onChange={setMedia} readOnly={readOnly} canEditAlt={canMediaWrite} error={mediaError} />
            <Card title="Opciones" description="Talla, color, material… Cada combinación es una variante.">
              <OptionsEditor options={optDrafts} onChange={setOptDrafts} readOnly={readOnly} error={optError} />
              {!readOnly ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm" loading={busy} disabled={!optionsDirty} onClick={() => void applyOptions(false)}>
                    Aplicar opciones
                  </Button>
                  {optionsDirty ? (
                    <Button size="sm" variant="ghost" onClick={() => { setOptDrafts(draftsFromOptions(product.options)); setOptError(null); }}>
                      Restablecer
                    </Button>
                  ) : null}
                  <p className="text-xs text-muted">
                    Aplicar quita los valores borrados y conserva las variantes existentes; las combinaciones nuevas se crean con «Generar faltantes». Renombrar una opción o valor equivale a borrar el antiguo y crear uno nuevo.
                  </p>
                </div>
              ) : null}
            </Card>
            <VariantsCard
              product={product}
              rows={rows}
              onRows={setRows}
              errors={rowErrors}
              readOnly={readOnly}
              onChanged={async () => {
                await reloadAll();
              }}
            />
          </fieldset>
          <ProductInventoryCard product={product} />
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            <MetafieldsEditor rows={metaRows} onChange={setMetaRows} readOnly={readOnly} loading={meta.isLoading} errors={metaErrors} />
            <SeoCard
              seoTitle={draft.seoTitle}
              seoDescription={draft.seoDescription}
              onSeoTitle={(v) => patchDraft({ seoTitle: v })}
              onSeoDescription={(v) => patchDraft({ seoDescription: v })}
              fallbackTitle={draft.title}
              fallbackDescription=""
              path={`/products/${draft.handle || product.handle}`}
              maxTitle={LIMITS.seoTitle}
              maxDescription={LIMITS.seoDescription}
              errors={errors}
            />
          </fieldset>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4">
          <Card title="Estado y publicación">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={product.status} />
                {product.publishedAt ? <span className="text-xs text-muted">Publicado {formatDateTime(product.publishedAt)}</span> : null}
              </div>
              {canWrite ? (
                <>
                  {product.status !== "active" ? (
                    <Button variant="primary" loading={busy} leftIcon={<Upload aria-hidden size={15} />} onClick={() => void publish()}>
                      Publicar
                    </Button>
                  ) : null}
                  {product.status !== "archived" ? (
                    <Button loading={busy} leftIcon={<Archive aria-hidden size={15} />} onClick={() => void archive()}>
                      Archivar
                    </Button>
                  ) : null}
                  <Button loading={busy} leftIcon={<Copy aria-hidden size={15} />} onClick={() => void duplicate()}>
                    Duplicar
                  </Button>
                  <Button variant="danger" loading={busy} leftIcon={<Trash2 aria-hidden size={15} />} onClick={() => void remove()}>
                    Eliminar
                  </Button>
                </>
              ) : null}
              {product.status === "active" ? (
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-info hover:underline">
                  Ver en la tienda <ExternalLink aria-hidden size={13} />
                </a>
              ) : null}
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                <li>Para publicar se necesita al menos una variante activa con precio mayor a $0.</li>
                <li>Duplicar crea un borrador sin SKU (son únicos en toda la tienda).</li>
                {product.status !== "active" && !hasPublishable ? <li className="text-warning">Ahora mismo no hay ninguna variante activa con precio.</li> : null}
              </ul>
            </div>
          </Card>
          <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
            <OrganizationCard draft={draft} set={patchDraft} errors={errors} showHandle />
          </fieldset>
        </div>
      </div>

      {canWrite && (dirty || saving) ? (
        <div role="region" aria-label="Cambios sin guardar" className="sticky bottom-3 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-strong bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm">Tienes cambios sin guardar.</span>
          <span className="flex gap-2">
            <Button disabled={saving} onClick={() => void discard()}>
              Descartar
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void save()}>
              Guardar cambios
            </Button>
          </span>
        </div>
      ) : null}

      <ConfirmDialog
        open={forceInfo !== null}
        title="Hay variantes activas que usan esos valores"
        description={
          <span className="block text-left">
            Si continúas, estas variantes se desactivarán y se les quitará el valor eliminado:
            <span className="mt-2 block font-medium">{forceInfo?.variants.map((v) => v.title).join(", ")}</span>
            {forceInfo?.removed.length ? <span className="mt-2 block text-muted">Valores eliminados: {forceInfo.removed.map((r) => r.label ?? r.id).join(", ")}</span> : null}
          </span>
        }
        confirmLabel="Desactivar variantes y aplicar"
        tone="danger"
        loading={busy}
        onConfirm={() => void applyOptions(true)}
        onCancel={() => setForceInfo(null)}
      />
    </>
  );
}

