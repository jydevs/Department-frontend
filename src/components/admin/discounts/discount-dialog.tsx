"use client";

import { useState } from "react";
import { Button, DateTimeInput, Dialog, Input, MoneyInput, Select, Switch, useToast } from "@/components/admin/ui";
import { Notice, fieldErrorsOf, formErrorOf, apiMessage } from "@/components/admin/settings/shared";

import { DISCOUNT_TYPE_LABELS, useCreateDiscount, useUpdateDiscount, type Discount, type DiscountType, type DiscountUpdate } from "@/lib/admin/api/discounts";

const MAX_FIXED = 2_000_000_000;

interface Props {
  /** null = crear. */
  discount: Discount | null;
  onClose: () => void;
}

export function DiscountDialog({ discount, onClose }: Props) {
  const toast = useToast();
  const create = useCreateDiscount();
  const update = useUpdateDiscount();
  const editing = discount !== null;

  const [code, setCode] = useState(discount?.code ?? "");
  const [title, setTitle] = useState(discount?.title ?? "");
  const [type, setType] = useState<DiscountType>(discount?.type ?? "percent");
  const [percent, setPercent] = useState(discount?.type === "percent" ? String(discount.value) : "10");
  const [fixed, setFixed] = useState<number | null>(discount?.type === "fixed" ? discount.value : null);
  const [minSubtotal, setMinSubtotal] = useState<number | null>(discount?.minSubtotal ?? null);
  const [startsAt, setStartsAt] = useState<string | null>(discount?.startsAt ?? null);
  const [endsAt, setEndsAt] = useState<string | null>(discount?.endsAt ?? null);
  const [usageLimit, setUsageLimit] = useState(discount?.usageLimit != null ? String(discount.usageLimit) : "");
  const [oncePerEmail, setOncePerEmail] = useState(discount?.oncePerEmail ?? false);
  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const valueNumber = type === "percent" ? Number(percent) : type === "fixed" ? (fixed ?? 0) : 0;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!editing && !/^[A-Z0-9_-]{3,40}$/.test(code)) e.code = "De 3 a 40 caracteres: letras A-Z, números, guion y guion bajo.";
    if (title.trim().length < 2) e.title = "Mínimo 2 caracteres.";
    if (type === "percent" && (!Number.isInteger(valueNumber) || valueNumber < 1 || valueNumber > 100)) e.value = "Entero entre 1 y 100.";
    if (type === "fixed" && (valueNumber < 1 || valueNumber > MAX_FIXED)) e.value = "Indica un monto mayor a 0.";
    if (usageLimit && (!/^\d+$/.test(usageLimit) || Number(usageLimit) < 1 || Number(usageLimit) > 10_000_000)) e.usageLimit = "Entero entre 1 y 10.000.000 (vacío = sin límite).";
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) e.endsAt = "Debe ser posterior al inicio.";
    return e;
  };

  const submit = async () => {
    setFormError(null);
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      if (!editing) {
        await create.mutateAsync({
          code,
          title: title.trim(),
          type,
          value: valueNumber,
          minSubtotal,
          ...(startsAt ? { startsAt } : {}),
          endsAt,
          usageLimit: usageLimit ? Number(usageLimit) : null,
          oncePerEmail,
          isActive,
        });
        toast.success(`Descuento ${code} creado`);
      } else {
        const patch: DiscountUpdate = {};
        if (title.trim() !== discount.title) patch.title = title.trim();
        if (type !== "free_shipping" && valueNumber !== discount.value) patch.value = valueNumber;
        if (minSubtotal !== discount.minSubtotal) patch.minSubtotal = minSubtotal;
        if (startsAt && startsAt !== discount.startsAt) patch.startsAt = startsAt;
        if (endsAt !== discount.endsAt) patch.endsAt = endsAt;
        const limit = usageLimit ? Number(usageLimit) : null;
        if (limit !== discount.usageLimit) patch.usageLimit = limit;
        if (oncePerEmail !== discount.oncePerEmail) patch.oncePerEmail = oncePerEmail;
        if (isActive !== discount.isActive) patch.isActive = isActive;
        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        await update.mutateAsync({ id: discount.id, patch });
        toast.success("Descuento actualizado");
      }
      onClose();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(formErrorOf(err));
      toast.error(apiMessage(err));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!pending}
      size="lg"
      title={editing ? `Editar ${discount.code}` : "Nuevo descuento"}
      description={editing ? "El código y el tipo no se pueden cambiar una vez creado." : "Los clientes lo aplican con el código en el checkout."}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            {editing ? "Guardar cambios" : "Crear descuento"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
          disabled={editing}
          error={errors.code}
          hint="Se guarda en MAYÚSCULAS. Ej.: VERANO20"
          maxLength={40}
          required
          autoComplete="off"
          data-autofocus=""
        />
        <Input label="Título interno" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={120} required />
        <Select
          label="Tipo"
          value={type}
          disabled={editing}
          onChange={(e) => setType(e.target.value as DiscountType)}
          options={(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((t) => ({ value: t, label: DISCOUNT_TYPE_LABELS[t] }))}
        />
        {type === "percent" ? (
          <Input label="Porcentaje" type="number" min={1} max={100} step={1} value={percent} onChange={(e) => setPercent(e.target.value)} error={errors.value} rightAddon="%" required />
        ) : type === "fixed" ? (
          <MoneyInput label="Monto a descontar" value={fixed} onChange={setFixed} error={errors.value} max={MAX_FIXED} required />
        ) : (
          <div className="flex items-end text-sm text-muted">El envío será gratis; no lleva valor.</div>
        )}
        <MoneyInput label="Subtotal mínimo" value={minSubtotal} onChange={setMinSubtotal} error={errors.minSubtotal} hint="Vacío = sin mínimo." max={10_000_000_000} />
        <Input label="Límite de usos" inputMode="numeric" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value.replace(/\D/g, ""))} error={errors.usageLimit} hint="Vacío = ilimitado." />
        <DateTimeInput label="Inicia" value={startsAt} onChange={setStartsAt} error={errors.startsAt} hint={editing ? "Hora de Colombia (UTC-5)" : "Vacío = desde ahora. Hora de Colombia (UTC-5)"} />
        <DateTimeInput label="Termina" value={endsAt} onChange={setEndsAt} error={errors.endsAt} hint="Vacío = sin vencimiento. Hora de Colombia (UTC-5)" />
        <Switch checked={oncePerEmail} onChange={setOncePerEmail} label="Un solo uso por correo" hint="Cada correo puede canjearlo una vez." />
        <Switch checked={isActive} onChange={setIsActive} label="Activo" hint="Desactívalo para pausarlo sin borrarlo." />
        {formError ? (
          <div className="sm:col-span-2">
            <Notice tone="danger">{formError}</Notice>
          </div>
        ) : null}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Guardar
        </button>
      </form>
    </Dialog>
  );
}
