"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button, Checkbox, Dialog, Input, Switch, useToast } from "@/components/admin/ui";
import { ApiError } from "@/lib/admin/errors";
import { Notice, fieldErrorsOf, formErrorOf, norm, shippingError } from "./shared";
import { COLOMBIA_DEPARTMENTS, useCreateZone, useUpdateZone, type ShippingZone } from "@/lib/admin/api/shipping";

export function ZoneDialog({ zone, takenDepartments, onClose }: { zone: ShippingZone | null; takenDepartments: Map<string, string>; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateZone();
  const update = useUpdateZone();
  const editing = zone !== null;
  const [name, setName] = useState(zone?.name ?? "");
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [allCountry, setAllCountry] = useState(zone?.departments.includes("*") ?? false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => {
    const known = new Map(COLOMBIA_DEPARTMENTS.map((d) => [norm(d), d as string]));
    const out = new Set<string>();
    for (const d of zone?.departments ?? []) if (d !== "*") out.add(known.get(norm(d)) ?? d);
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const extras = [...selected].filter((d) => !(COLOMBIA_DEPARTMENTS as readonly string[]).includes(d));
  const all = [...COLOMBIA_DEPARTMENTS, ...extras] as string[];
  const q = norm(search);
  const visible = q ? all.filter((d) => norm(d).includes(q)) : all;

  const toggle = (d: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  const submit = async () => {
    setFormError(null);
    const local: Record<string, string> = {};
    const trimmed = name.trim();
    if (trimmed.length < 2) local.name = "Mínimo 2 caracteres.";
    const departments = allCountry ? ["*"] : all.filter((d) => selected.has(d));
    if (departments.length === 0) local.departments = "Elige al menos un departamento o «Todo el país».";
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      if (editing) {
        await update.mutateAsync({ id: zone.id, patch: { name: trimmed, departments, isActive } });
        toast.success("Zona actualizada");
      } else {
        await create.mutateAsync({ name: trimmed, departments, isActive });
        toast.success("Zona creada");
      }
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ZONE_EXISTS") {
        setErrors({ name: shippingError(e) });
        setFormError(null);
      } else {
        setErrors(fieldErrorsOf(e));
        setFormError(formErrorOf(e));
      }
      toast.error(shippingError(e));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!pending}
      size="lg"
      title={editing ? "Editar zona" : "Nueva zona de envío"}
      description="Una zona agrupa departamentos que comparten las mismas tarifas."
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            {editing ? "Guardar cambios" : "Crear zona"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input label="Nombre de la zona" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} required data-autofocus="" placeholder="Bogotá" />
          <Switch checked={isActive} onChange={setIsActive} label="Zona activa" />
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[13px] font-medium">Cobertura</legend>
          <Checkbox
            checked={allCountry}
            onChange={(e) => setAllCountry(e.target.checked)}
            label="Todo el país"
            hint="Cubre cualquier departamento (*). No se puede combinar con departamentos específicos."
          />
          <div className={allCountry ? "pointer-events-none opacity-40" : undefined} aria-disabled={allCountry}>
            <Input
              aria-label="Buscar departamento"
              placeholder="Buscar departamento…"
              leftIcon={<Search aria-hidden size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={allCountry}
              wrapperClassName="mb-2"
            />
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{selected.size} seleccionado(s)</span>
              <span className="flex gap-3">
                <button type="button" className="hover:text-text hover:underline" onClick={() => setSelected((p) => new Set([...p, ...visible]))}>
                  {q ? "Seleccionar los que se ven" : "Seleccionar todos"}
                </button>
                <button type="button" className="hover:text-text hover:underline" onClick={() => setSelected(new Set())}>
                  Quitar todos
                </button>
              </span>
            </div>
            <div className="grid max-h-72 gap-x-4 gap-y-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3" role="group" aria-label="Departamentos">
              {visible.length === 0 ? <p className="col-span-full py-4 text-center text-sm text-muted">Ningún departamento coincide con «{search}».</p> : null}
              {visible.map((d) => {
                const other = takenDepartments.get(norm(d));
                const usedElsewhere = other && other !== zone?.name;
                return (
                  <Checkbox
                    key={d}
                    checked={selected.has(d)}
                    disabled={allCountry}
                    onChange={() => toggle(d)}
                    label={d}
                    hint={usedElsewhere ? `También en «${other}»` : undefined}
                  />
                );
              })}
            </div>
          </div>
          {errors.departments ? <p role="alert" className="text-xs text-danger">{errors.departments}</p> : null}
        </fieldset>
        <Notice>
          Si un departamento está en una zona y también en «Todo el país», el comprador solo ve las tarifas de la zona que nombra su departamento.
        </Notice>
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
      </div>
    </Dialog>
  );
}
