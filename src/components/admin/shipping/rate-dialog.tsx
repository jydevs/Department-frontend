"use client";

import { useState } from "react";
import { Button, Dialog, Input, MoneyInput, Switch, useToast } from "@/components/admin/ui";
import { Notice, fieldErrorsOf, formErrorOf, ratePreview, shippingError } from "./shared";
import { useCreateRate, useUpdateRate, type RateInput, type ShippingRate, type ShippingZone } from "@/lib/admin/api/shipping";

const intOrNull = (s: string): number | null => (s.trim() === "" ? null : Number(s));

export function RateDialog({ zone, rate, onClose }: { zone: ShippingZone; rate: ShippingRate | null; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateRate();
  const update = useUpdateRate();
  const editing = rate !== null;
  const [name, setName] = useState(rate?.name ?? "");
  const [price, setPrice] = useState<number | null>(rate?.price ?? null);
  const [freeOver, setFreeOver] = useState<number | null>(rate?.freeOverSubtotal ?? null);
  const [minDays, setMinDays] = useState(rate?.minDays != null ? String(rate.minDays) : "");
  const [maxDays, setMaxDays] = useState(rate?.maxDays != null ? String(rate.maxDays) : "");
  const [position, setPosition] = useState(String(rate?.position ?? zone.rates.length));
  const [isActive, setIsActive] = useState(rate?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    setFormError(null);
    const e: Record<string, string> = {};
    const min = intOrNull(minDays);
    const max = intOrNull(maxDays);
    const pos = Number(position === "" ? 0 : position);
    if (!name.trim()) e.name = "Obligatorio.";
    if (price === null) e.price = "Indica el precio (0 = gratis).";
    if (min !== null && (!Number.isInteger(min) || min < 0 || min > 365)) e.minDays = "Entre 0 y 365.";
    if (max !== null && (!Number.isInteger(max) || max < 0 || max > 365)) e.maxDays = "Entre 0 y 365.";
    if (min !== null && max !== null && min > max) e.minDays = "No puede superar los días máximos.";
    if (!Number.isInteger(pos) || pos < 0 || pos > 1000) e.position = "Entero entre 0 y 1000.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const body: RateInput = { name: name.trim(), price: price ?? 0, freeOverSubtotal: freeOver, minDays: min, maxDays: max, isActive, position: pos };
    try {
      if (editing) {
        await update.mutateAsync({ id: rate.id, patch: body });
        toast.success("Tarifa actualizada");
      } else {
        await create.mutateAsync({ ...body, zoneId: zone.id });
        toast.success("Tarifa creada");
      }
      onClose();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(formErrorOf(err));
      toast.error(shippingError(err));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!pending}
      title={editing ? `Editar tarifa de «${zone.name}»` : `Nueva tarifa en «${zone.name}»`}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            {editing ? "Guardar cambios" : "Crear tarifa"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} placeholder="Envío estándar" required data-autofocus="" />
        </div>
        <MoneyInput label="Precio" value={price} onChange={setPrice} error={errors.price} required />
        <MoneyInput label="Envío gratis desde" value={freeOver} onChange={setFreeOver} error={errors.freeOverSubtotal} hint="Subtotal a partir del cual es gratis. Vacío = nunca." />
        <Input label="Días mínimos" inputMode="numeric" value={minDays} onChange={(e) => setMinDays(e.target.value.replace(/\D/g, ""))} error={errors.minDays} />
        <Input label="Días máximos" inputMode="numeric" value={maxDays} onChange={(e) => setMaxDays(e.target.value.replace(/\D/g, ""))} error={errors.maxDays} />
        <Input label="Orden" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))} error={errors.position} hint="Menor aparece primero." />
        <div className="flex items-center">
          <Switch checked={isActive} onChange={setIsActive} label="Tarifa activa" />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-muted">Así lo verá el comprador</p>
          <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2.5 text-sm" data-testid="rate-preview">
            {ratePreview({ name, price, freeOverSubtotal: freeOver, minDays: intOrNull(minDays), maxDays: intOrNull(maxDays) })}
          </div>
        </div>
        {formError ? (
          <div className="sm:col-span-2">
            <Notice tone="danger">{formError}</Notice>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
