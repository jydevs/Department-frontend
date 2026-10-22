"use client";

import { useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Checkbox, Dialog, EmptyState, IconButton, Input, MoneyInput, Select, Switch, useConfirm, useToast } from "@/components/admin/ui";
import { LIMITS, productsApi, type ProductDetail, type Variant, type UpdateVariantInput, type VariantInput } from "@/lib/admin/api/products";
import { errorMessage } from "@/lib/admin/errors";
import { formatCop } from "@/lib/admin/format";
import { cn } from "@/lib/admin/utils";
import { controlClasses } from "@/components/admin/ui/field";

/* ------------------------------ modelo de filas ------------------------------ */

export interface VariantRow {
  id: string;
  title: string;
  sku: string;
  price: number | null;
  compareAtPrice: number | null;
  weightGrams: string;
  barcode: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  isActive: boolean;
}

export function rowFromVariant(v: Variant): VariantRow {
  return {
    id: v.id,
    title: v.title,
    sku: v.sku ?? "",
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    weightGrams: v.weightGrams === null ? "" : String(v.weightGrams),
    barcode: v.barcode ?? "",
    trackInventory: v.trackInventory,
    allowBackorder: v.allowBackorder,
    isActive: v.isActive,
  };
}

/** Mantiene lo editado por el usuario y sincroniza altas/bajas de variantes con el servidor. */
export function reconcileRows(prev: VariantRow[], variants: Variant[]): VariantRow[] {
  const prevById = new Map(prev.map((r) => [r.id, r]));
  return variants.map((v) => prevById.get(v.id) ?? rowFromVariant(v));
}

export function variantChanges(row: VariantRow, base: Variant): UpdateVariantInput | null {
  const out: UpdateVariantInput = {};
  if (row.title.trim() !== base.title) out.title = row.title.trim();
  const sku = row.sku.trim() === "" ? null : row.sku.trim();
  if (sku !== base.sku) out.sku = sku;
  if (row.price !== null && row.price !== base.price) out.price = row.price;
  if (row.compareAtPrice !== base.compareAtPrice) out.compareAtPrice = row.compareAtPrice;
  const weight = row.weightGrams.trim() === "" ? null : Number(row.weightGrams);
  if (weight !== base.weightGrams) out.weightGrams = weight;
  const barcode = row.barcode.trim() === "" ? null : row.barcode.trim();
  if (barcode !== base.barcode) out.barcode = barcode;
  if (row.trackInventory !== base.trackInventory) out.trackInventory = row.trackInventory;
  if (row.allowBackorder !== base.allowBackorder) out.allowBackorder = row.allowBackorder;
  if (row.isActive !== base.isActive) out.isActive = row.isActive;
  return Object.keys(out).length ? out : null;
}

export type RowErrors = Partial<Record<"title" | "sku" | "price" | "compareAtPrice" | "weightGrams" | "barcode" | "row", string>>;

export function validateRow(row: VariantRow): RowErrors {
  const e: RowErrors = {};
  if (!row.title.trim()) e.title = "Obligatorio.";
  else if (row.title.length > 255) e.title = "Máx. 255.";
  if (row.price === null) e.price = "Obligatorio.";
  if (row.price !== null && row.compareAtPrice !== null && row.compareAtPrice < row.price) e.compareAtPrice = "Debe ser ≥ precio.";
  if (row.sku.length > 120) e.sku = "Máx. 120.";
  if (row.barcode.length > 120) e.barcode = "Máx. 120.";
  if (row.weightGrams.trim() !== "") {
    const w = Number(row.weightGrams);
    if (!Number.isInteger(w) || w < 0) e.weightGrams = "Entero ≥ 0.";
  }
  return e;
}

/* ------------------------------ celdas ------------------------------ */

function CellText({ label, value, onChange, error, disabled, className, inputMode }: { label: string; value: string; onChange: (v: string) => void; error?: string; disabled?: boolean; className?: string; inputMode?: "numeric" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClasses, "h-8 px-2 text-[13px]", className)}
      />
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  );
}

function CellMoney({ label, value, onChange, error, disabled }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-0.5">
      <input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={draft ?? (value === null ? "" : formatCop(value))}
        onFocus={(e) => {
          const el = e.currentTarget;
          setDraft(value === null ? "" : String(value));
          requestAnimationFrame(() => el.select());
        }}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          setDraft(digits);
          onChange(digits ? Math.min(1e10, parseInt(digits, 10)) : null);
        }}
        className={cn(controlClasses, "h-8 px-2 text-right text-[13px] tabular-nums")}
      />
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  );
}

/* ------------------------------ tarjeta ------------------------------ */

interface Props {
  product: ProductDetail;
  rows: VariantRow[];
  onRows: (rows: VariantRow[]) => void;
  errors: Record<string, RowErrors>;
  readOnly?: boolean;
  /** Tras alta/baja/generación el padre vuelve a leer el producto. */
  onChanged: () => Promise<void>;
}

function optionLabel(product: ProductDetail, v: Variant): string {
  const labels = v.optionValueIds
    .map((id) => product.options.flatMap((o) => o.values.map((x) => ({ ...x, option: o.name }))).find((x) => x.id === id))
    .filter(Boolean)
    .map((x) => `${x!.option}: ${x!.value}`);
  return labels.join(" · ");
}

function comboKey(ids: string[]): string {
  return [...ids].sort().join("|");
}

export function VariantsCard({ product, rows, onRows, errors, readOnly, onChanged }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (id: string, patch: Partial<VariantRow>) => onRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const byId = new Map(product.variants.map((v) => [v.id, v]));

  // combinaciones de opciones que aún no tienen variante
  const existing = new Set(product.variants.filter((v) => v.isActive).map((v) => comboKey(v.optionValueIds)));
  const combos = product.options.reduce<Array<{ ids: string[]; labels: string[] }>>(
    (acc, o) => acc.flatMap((a) => o.values.map((v) => ({ ids: [...a.ids, v.id], labels: [...a.labels, v.value] }))),
    [{ ids: [], labels: [] }],
  );
  const missing = product.options.length ? combos.filter((c) => !existing.has(comboKey(c.ids))) : [];

  const remove = async (v: Variant) => {
    const ok = await confirm({
      title: `¿Eliminar la variante «${v.title}»?`,
      description: "Se desactiva y se libera su SKU (el historial de inventario se conserva). No puedes dejar un producto publicado sin variantes activas.",
      confirmLabel: "Eliminar variante",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await productsApi.deleteVariant(product.id, v.id);
      toast.success("Variante eliminada.");
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    const room = LIMITS.maxVariants - product.variants.length;
    if (missing.length > room) {
      toast.error(`Solo caben ${Math.max(0, room)} variantes más (máximo ${LIMITS.maxVariants}).`);
      return;
    }
    const base = rows.find((r) => r.isActive && r.price !== null)?.price ?? 0;
    const ok = await confirm({
      title: `Crear ${missing.length} variante${missing.length === 1 ? "" : "s"} faltante${missing.length === 1 ? "" : "s"}`,
      description: `Se crearán las combinaciones de opciones que aún no existen con precio ${formatCop(base)}. Después puedes ajustar precios y SKU.`,
      confirmLabel: "Crear variantes",
    });
    if (!ok) return;
    setBusy(true);
    try {
      for (const c of missing) {
        await productsApi.createVariant(product.id, { title: c.labels.join(" / "), price: base, optionValueIds: c.ids });
      }
      toast.success(`${missing.length} variantes creadas.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      await onChanged();
      setBusy(false);
    }
  };

  return (
    <Card
      title="Variantes"
      description="Edita precios, SKU y stock en línea; se guardan con «Guardar cambios»."
      actions={
        readOnly ? null : (
          <>
            {missing.length > 0 ? (
              <Button size="sm" leftIcon={<Layers aria-hidden size={14} />} loading={busy} onClick={() => void generate()}>
                Generar {missing.length} faltante{missing.length === 1 ? "" : "s"}
              </Button>
            ) : null}
            <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} disabled={product.variants.length >= LIMITS.maxVariants} onClick={() => setAdding(true)}>
              Añadir variante
            </Button>
          </>
        )
      }
      flush
    >
      {rows.length === 0 ? (
        <EmptyState title="Sin variantes" description="Añade al menos una variante con precio para poder publicar." className="py-8" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm max-md:block md:min-w-[1040px]" aria-label="Variantes del producto">
            <thead className="max-md:hidden">
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="px-4 py-2.5">Variante</th>
                <th scope="col" className="px-2 py-2.5">SKU</th>
                <th scope="col" className="px-2 py-2.5 text-right">Precio</th>
                <th scope="col" className="px-2 py-2.5 text-right">Comparado</th>
                <th scope="col" className="px-2 py-2.5 text-right">Peso (g)</th>
                <th scope="col" className="px-2 py-2.5">Código barras</th>
                <th scope="col" className="px-2 py-2.5 text-center">Stock</th>
                <th scope="col" className="px-2 py-2.5 text-center">Backorder</th>
                <th scope="col" className="px-2 py-2.5 text-center">Activa</th>
                <th scope="col" className="relative px-2 py-2.5"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="max-md:block">
              {rows.map((r) => {
                const base = byId.get(r.id);
                const err = errors[r.id] ?? {};
                const label = base ? optionLabel(product, base) : "";
                return (
                  <tr key={r.id} className={cn("border-b border-border align-top last:border-0 max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:p-3", !r.isActive && "opacity-60")}>
                    <td className="px-4 py-2.5 max-md:col-span-2 max-md:block max-md:p-0">
                      <CellText label={`Título de la variante ${r.title}`} value={r.title} error={err.title} disabled={readOnly} onChange={(v) => set(r.id, { title: v })} />
                      {label ? <span className="mt-1 block text-[11px] text-muted">{label}</span> : null}
                      {err.row ? <span role="alert" className="mt-1 block text-[11px] text-danger">{err.row}</span> : null}
                    </td>
                    <td className="px-2 py-2.5 max-md:block max-md:p-0">
                      <span className="mb-1 block text-[11px] text-muted md:hidden">SKU</span>
                      <CellText label={`SKU de ${r.title}`} value={r.sku} error={err.sku} disabled={readOnly} onChange={(v) => set(r.id, { sku: v })} />
                    </td>
                    <td className="w-32 px-2 py-2.5 max-md:block max-md:w-auto max-md:p-0">
                      <span className="mb-1 block text-[11px] text-muted md:hidden">Precio</span>
                      <CellMoney label={`Precio de ${r.title}`} value={r.price} error={err.price} disabled={readOnly} onChange={(v) => set(r.id, { price: v })} />
                    </td>
                    <td className="w-32 px-2 py-2.5 max-md:block max-md:w-auto max-md:p-0">
                      <span className="mb-1 block text-[11px] text-muted md:hidden">Precio comparado</span>
                      <CellMoney label={`Precio comparado de ${r.title}`} value={r.compareAtPrice} error={err.compareAtPrice} disabled={readOnly} onChange={(v) => set(r.id, { compareAtPrice: v })} />
                    </td>
                    <td className="w-24 px-2 py-2.5 max-md:block max-md:w-auto max-md:p-0">
                      <span className="mb-1 block text-[11px] text-muted md:hidden">Peso (g)</span>
                      <CellText label={`Peso en gramos de ${r.title}`} value={r.weightGrams} inputMode="numeric" error={err.weightGrams} disabled={readOnly} className="text-right" onChange={(v) => set(r.id, { weightGrams: v.replace(/[^\d]/g, "") })} />
                    </td>
                    <td className="px-2 py-2.5 max-md:block max-md:p-0">
                      <span className="mb-1 block text-[11px] text-muted md:hidden">Código de barras</span>
                      <CellText label={`Código de barras de ${r.title}`} value={r.barcode} error={err.barcode} disabled={readOnly} onChange={(v) => set(r.id, { barcode: v })} />
                    </td>
                    <td className="px-2 py-3 text-center max-md:flex max-md:items-center max-md:gap-2 max-md:p-0 max-md:text-left">
                      <input type="checkbox" aria-label={`Controlar stock de ${r.title}`} disabled={readOnly} checked={r.trackInventory} onChange={(e) => set(r.id, { trackInventory: e.target.checked })} className="size-4 cursor-pointer accent-[var(--accent)]" />
                      <span className="text-xs md:hidden">Controlar stock</span>
                    </td>
                    <td className="px-2 py-3 text-center max-md:flex max-md:items-center max-md:gap-2 max-md:p-0 max-md:text-left">
                      <input type="checkbox" aria-label={`Permitir backorder de ${r.title}`} disabled={readOnly} checked={r.allowBackorder} onChange={(e) => set(r.id, { allowBackorder: e.target.checked })} className="size-4 cursor-pointer accent-[var(--accent)]" />
                      <span className="text-xs md:hidden">Permitir backorder</span>
                    </td>
                    <td className="px-2 py-3 text-center max-md:flex max-md:items-center max-md:gap-2 max-md:p-0 max-md:text-left">
                      <input type="checkbox" aria-label={`Variante ${r.title} activa`} disabled={readOnly} checked={r.isActive} onChange={(e) => set(r.id, { isActive: e.target.checked })} className="size-4 cursor-pointer accent-[var(--accent)]" />
                      <span className="text-xs md:hidden">Activa</span>
                    </td>
                    <td className="px-2 py-2 text-right max-md:col-span-2 max-md:block max-md:p-0">
                      {!readOnly && base ? <IconButton label={`Eliminar variante ${r.title}`} size="sm" icon={<Trash2 aria-hidden size={14} />} disabled={busy} onClick={() => void remove(base)} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-5 py-3 text-xs text-muted">
        {product.variants.length}/{LIMITS.maxVariants} variantes. El precio comparado debe ser mayor o igual al precio. Cambiar el seguimiento o el backorder se bloquea mientras haya stock reservado.
        {rows.some((r) => !r.isActive) ? <Badge className="ml-2">Las variantes inactivas no se venden</Badge> : null}
      </p>
      <AddVariantDialog open={adding} onClose={() => setAdding(false)} product={product} onCreated={onChanged} />
    </Card>
  );
}

/* ------------------------------ diálogo de alta ------------------------------ */

function AddVariantDialog({ open, onClose, product, onCreated }: { open: boolean; onClose: () => void; product: ProductDetail; onCreated: () => Promise<void> }) {
  if (!open) return null;
  return <AddVariantForm onClose={onClose} product={product} onCreated={onCreated} />;
}

function AddVariantForm({ onClose, product, onCreated }: { onClose: () => void; product: ProductDetail; onCreated: () => Promise<void> }) {
  const toast = useToast();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [compare, setCompare] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [barcode, setBarcode] = useState("");
  const [track, setTrack] = useState(true);
  const [backorder, setBackorder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasOptions = product.options.length > 0;
  const autoTitle = hasOptions ? product.options.map((o) => o.values.find((v) => v.id === choice[o.id])?.value ?? "").filter(Boolean).join(" / ") : "";
  const shownTitle = hasOptions ? autoTitle : title;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (hasOptions && product.options.some((o) => !choice[o.id])) e.options = "Elige un valor para cada opción.";
    if (!shownTitle.trim()) e.title = "Obligatorio.";
    if (price === null) e.price = "Obligatorio.";
    if (price !== null && compare !== null && compare < price) e.compare = "Debe ser mayor o igual al precio.";
    if (weight.trim() !== "" && (!Number.isInteger(Number(weight)) || Number(weight) < 0)) e.weight = "Entero ≥ 0.";
    setErrors(e);
    if (Object.keys(e).length || price === null) return;
    const body: VariantInput = {
      title: shownTitle.trim(),
      price,
      compareAtPrice: compare,
      sku: sku.trim() || null,
      weightGrams: weight.trim() === "" ? null : Number(weight),
      barcode: barcode.trim() || null,
      trackInventory: track,
      allowBackorder: backorder,
      optionValueIds: hasOptions ? product.options.map((o) => choice[o.id]) : [],
    };
    setBusy(true);
    try {
      await productsApi.createVariant(product.id, body);
      toast.success("Variante creada.");
      await onCreated();
      onClose();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setErrors(code === "SKU_TAKEN" ? { sku: "Ese SKU ya está en uso." } : { form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title="Añadir variante"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>Crear variante</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {hasOptions ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {product.options.map((o) => (
              <Select key={o.id} label={o.name} value={choice[o.id] ?? ""} onChange={(e) => setChoice((c) => ({ ...c, [o.id]: e.target.value }))}>
                <option value="">Elige…</option>
                {o.values.map((v) => (
                  <option key={v.id} value={v.id}>{v.value}</option>
                ))}
              </Select>
            ))}
            {errors.options ? <p role="alert" className="text-xs text-danger sm:col-span-2">{errors.options}</p> : null}
          </div>
        ) : (
          <Input label="Título" value={title} error={errors.title} maxLength={255} onChange={(e) => setTitle(e.target.value)} required />
        )}
        {hasOptions ? <p className="text-sm text-muted">Título: <strong className="text-text">{autoTitle || "—"}</strong></p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput label="Precio" value={price} onChange={setPrice} error={errors.price} required />
          <MoneyInput label="Precio comparado" value={compare} onChange={setCompare} error={errors.compare} hint="Debe ser mayor o igual al precio" />
          <Input label="SKU" value={sku} maxLength={120} error={errors.sku} onChange={(e) => setSku(e.target.value)} />
          <Input label="Peso (g)" inputMode="numeric" value={weight} error={errors.weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))} />
          <Input label="Código de barras" value={barcode} maxLength={120} onChange={(e) => setBarcode(e.target.value)} wrapperClassName="sm:col-span-2" />
        </div>
        <div className="flex flex-col gap-2">
          <Switch checked={track} onChange={setTrack} label="Controlar stock de esta variante" />
          <Checkbox checked={backorder} onChange={(e) => setBackorder(e.target.checked)} label="Permitir vender sin stock (backorder)" />
        </div>
        {errors.form ? <p role="alert" className="text-sm text-danger">{errors.form}</p> : null}
      </div>
    </Dialog>
  );
}
