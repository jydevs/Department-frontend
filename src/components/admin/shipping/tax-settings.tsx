"use client";

import { useState } from "react";
import { Button, Card, ErrorState, Input, Skeleton, Switch, useToast } from "@/components/admin/ui";
import { Notice, fieldErrorsOf, formErrorOf, shippingError } from "./shared";
import { formatCop } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import { DateTime } from "@/components/admin/ui";
import { useTaxes, useUpdateTaxes, type TaxSettings } from "@/lib/admin/api/shipping";

function TaxForm({ tax, canWrite }: { tax: TaxSettings; canWrite: boolean }) {
  const toast = useToast();
  const update = useUpdateTaxes();
  const [includes, setIncludes] = useState(tax.pricesIncludeTax);
  const [rate, setRate] = useState(String(tax.ratePercent));
  const [label, setLabel] = useState(tax.label);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Misma fórmula que el servidor (centésimas de punto porcentual).
  const parsed = Number(rate);
  const rateOk = rate.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
  const hundredths = rateOk ? Math.round(parsed * 100) : 0;
  const lbl = label.trim() || "IVA";
  const BASE = 119_000;
  const example = !rateOk
    ? "Escribe una tarifa entre 0 y 100 para ver un ejemplo."
    : includes
      ? `Un producto de ${formatCop(BASE)} incluye ${formatCop(Math.round((BASE * hundredths) / (10_000 + hundredths)))} de ${lbl}. El cliente paga ${formatCop(BASE)}.`
      : `Un producto de ${formatCop(BASE)} suma ${formatCop(Math.round((BASE * hundredths) / 10_000))} de ${lbl}. El cliente paga ${formatCop(BASE + Math.round((BASE * hundredths) / 10_000))}.`;

  const dirty = includes !== tax.pricesIncludeTax || Number(rate) !== tax.ratePercent || label !== tax.label;

  const save = async () => {
    setFormError(null);
    const e: Record<string, string> = {};
    const n = Number(rate);
    if (rate.trim() === "" || Number.isNaN(n) || n < 0 || n > 100) e.ratePercent = "Entre 0 y 100.";
    else if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) e.ratePercent = "Máximo 2 decimales.";
    if (!label.trim()) e.label = "Obligatorio.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await update.mutateAsync({ pricesIncludeTax: includes, ratePercent: n, label: label.trim() });
      toast.success("Impuestos guardados");
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFormError(formErrorOf(err));
      toast.error(shippingError(err));
    }
  };

  return (
    <Card title="Impuesto sobre las ventas" description="Cómo se calcula y se muestra el IVA en la tienda.">
      <div className="grid max-w-xl gap-4">
        <Switch
          checked={includes}
          onChange={setIncludes}
          disabled={!canWrite}
          label="Los precios ya incluyen el impuesto"
          hint={includes ? "El IVA se desglosa dentro del precio; el total no cambia." : "El IVA se suma al precio al calcular el total."}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tarifa (%)" type="number" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.ratePercent} disabled={!canWrite} rightAddon="%" />
          <Input label="Etiqueta" value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} disabled={!canWrite} maxLength={40} placeholder="IVA" />
        </div>
        <Notice title="Ejemplo en vivo">
          <span data-testid="tax-example">{example}</span>
        </Notice>
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        {!canWrite ? (
          <Notice>Solo el personal con permiso de ajustes (<code>settings:write</code>) puede modificar los impuestos.</Notice>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">{tax.updatedAt ? <>Última modificación: <DateTime value={tax.updatedAt} /></> : "Aún no se ha modificado."}</p>
            <Button variant="primary" onClick={save} loading={update.isPending} disabled={!dirty}>
              Guardar impuestos
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TaxSettingsCard() {
  const canWrite = useCan("settings:write");
  const query = useTaxes();
  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <TaxForm key={query.data.updatedAt ?? "init"} tax={query.data} canWrite={canWrite} />;
}
