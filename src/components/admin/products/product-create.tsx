"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Checkbox, Input, MoneyInput, NoAccess, PageHeader, Switch, useToast } from "@/components/admin/ui";
import { LIMITS, productsApi, type CreateProductInput, type MediaInput } from "@/lib/admin/api/products";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { slugify } from "@/lib/admin/format";
import { MediaCard, type MediaDraft } from "./media-card";
import { OptionsEditor, comboCount, draftsToInput, valueCombos, validateOptions, type OptionDraft } from "./options-editor";
import { EMPTY_DRAFT, InfoCard, OrganizationCard, validateDraft, type ProductDraft } from "./product-form-parts";
import { SeoCard } from "./seo-card";
import { useUnsavedGuard } from "./use-unsaved-guard";

export function ProductCreate() {
  const canWrite = useCan("products:write");
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [compare, setCompare] = useState<number | null>(null);
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [barcode, setBarcode] = useState("");
  const [track, setTrack] = useState(true);
  const [backorder, setBackorder] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [optError, setOptError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = !!(draft.title || draft.descriptionHtml || media.length || options.length || price !== null || sku || draft.tags.length || draft.vendor || draft.productType || draft.seoTitle || draft.seoDescription);
  const guard = useUnsavedGuard(dirty && !saving);

  if (!canWrite) return <NoAccess permission="products:write" />;

  const patch = (p: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...p }));
  const hasOptions = options.length > 0;

  const submit = async () => {
    setFormError(null);
    const e = validateDraft(draft);
    const oErr = hasOptions ? validateOptions(options) : null;
    if (price === null) e.price = "El precio es obligatorio (puede ser $0 mientras sea borrador).";
    if (price !== null && compare !== null && compare < price) e.compare = "Debe ser mayor o igual al precio.";
    if (weight.trim() !== "" && (!Number.isInteger(Number(weight)) || Number(weight) < 0)) e.weight = "Entero ≥ 0.";
    setErrors(e);
    setOptError(oErr);
    if (Object.keys(e).length || oErr || price === null) {
      toast.error("Revisa los campos marcados.");
      return;
    }

    const body: CreateProductInput = {
      title: draft.title.trim(),
      descriptionHtml: draft.descriptionHtml,
      handle: draft.handle.trim() || slugify(draft.title) || undefined,
      vendor: draft.vendor.trim() || null,
      productType: draft.productType.trim() || null,
      tags: draft.tags,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
    };
    const baseFields = {
      price,
      compareAtPrice: compare,
      weightGrams: weight.trim() === "" ? null : Number(weight),
      barcode: barcode.trim() || null,
      trackInventory: track,
      allowBackorder: backorder,
    };
    if (hasOptions) {
      // una variante por combinación, ya con los valores base (sin pasadas posteriores de PATCH)
      body.options = draftsToInput(options);
      body.defaultVariantPrice = price;
      body.variants = valueCombos(options).map((values) => ({ title: values.join(" / "), optionValues: values, ...baseFields }));
    } else {
      body.variants = [
        {
          title: "Default Title",
          price,
          compareAtPrice: compare,
          sku: sku.trim() || null,
          weightGrams: weight.trim() === "" ? null : Number(weight),
          barcode: barcode.trim() || null,
          trackInventory: track,
          allowBackorder: backorder,
        },
      ];
    }

    setSaving(true);
    try {
      const created = await productsApi.create(body);
      const warnings: string[] = [];
      if (media.length) {
        try {
          const m: MediaInput[] = media.map((x) => ({ url: x.url, alt: x.alt.trim() || null }));
          await productsApi.updateMedia(created.id, m);
        } catch (err) {
          warnings.push(`las imágenes no se guardaron (${errorMessage(err)})`);
        }
      }
      await qc.invalidateQueries({ queryKey: ["products"] });
      if (warnings.length) toast.warning(`Producto creado, pero ${warnings.join("; ")}. Revísalo en el editor.`);
      else toast.success("Producto creado como borrador.");
      guard.leave(`/products/${created.id}`);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError) {
        const fe = err.fieldErrors();
        if (err.code === "VALIDATION_ERROR" && Object.keys(fe).length) {
          setErrors((prev) => ({ ...prev, ...fe }));
          setFormError(errorMessage(err));
          return;
        }
        if (err.code === "SKU_TAKEN") {
          setErrors((prev) => ({ ...prev, sku: "Ese SKU ya está en uso." }));
          return;
        }
        if (err.code === "CONFLICT" && /handle/i.test(err.message)) {
          setErrors((prev) => ({ ...prev, handle: "Ese handle ya está en uso." }));
          return;
        }
      }
      setFormError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Productos", href: "/products" }, { label: "Nuevo producto" }]}
        title="Nuevo producto"
        description="Se crea como borrador; publícalo cuando tenga variante con precio."
        actions={
          <Button variant="primary" loading={saving} onClick={() => void submit()}>
            Crear producto
          </Button>
        }
      />
      {formError ? (
        <p role="alert" className="mb-4 rounded-md border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <InfoCard draft={draft} set={patch} errors={errors} />
          <MediaCard items={media} onChange={setMedia} />
          <Card title="Opciones" description="Opcional. Cada combinación de valores genera una variante.">
            <OptionsEditor options={options} onChange={setOptions} error={optError} />
            {hasOptions ? <p className="mt-3 text-xs text-muted">Se crearán {comboCount(options)} variantes con el precio base de abajo (máximo {LIMITS.maxVariants}).</p> : null}
          </Card>
          <Card title={hasOptions ? "Precio base de las variantes" : "Precio e inventario"} description={hasOptions ? "Se aplica a todas las variantes generadas; luego puedes ajustarlas una a una." : undefined}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyInput label="Precio" required value={price} onChange={setPrice} error={errors.price} />
              <MoneyInput label="Precio comparado" value={compare} onChange={setCompare} error={errors.compare} hint="Mayor o igual al precio; se muestra tachado" />
              {!hasOptions ? <Input label="SKU" maxLength={120} value={sku} error={errors.sku} hint="Único en toda la tienda" onChange={(e) => setSku(e.target.value)} /> : null}
              <Input label="Peso (g)" inputMode="numeric" value={weight} error={errors.weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))} />
              <Input label="Código de barras" maxLength={120} value={barcode} onChange={(e) => setBarcode(e.target.value)} wrapperClassName={hasOptions ? undefined : "sm:col-span-2"} />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Switch checked={track} onChange={setTrack} label="Controlar el stock" hint="Después podrás registrar cantidades en el editor o en Inventario." />
              <Checkbox checked={backorder} onChange={(e) => setBackorder(e.target.checked)} label="Permitir vender sin stock (backorder)" />
            </div>
          </Card>
          <SeoCard
            seoTitle={draft.seoTitle}
            seoDescription={draft.seoDescription}
            onSeoTitle={(v) => patch({ seoTitle: v })}
            onSeoDescription={(v) => patch({ seoDescription: v })}
            fallbackTitle={draft.title}
            fallbackDescription=""
            path={`/products/${draft.handle || slugify(draft.title) || "nuevo-producto"}`}
            maxTitle={LIMITS.seoTitle}
            maxDescription={LIMITS.seoDescription}
            errors={errors}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4">
          <OrganizationCard draft={draft} set={patch} errors={errors} showHandle handleHint="Opcional: si lo dejas vacío se genera del título." />
          <Card>
            <p className="text-xs text-muted">Los metafields, el inventario por ubicación y la publicación están disponibles al abrir el producto, una vez creado.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
