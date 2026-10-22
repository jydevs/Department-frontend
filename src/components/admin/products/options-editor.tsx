"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, TagInput } from "@/components/admin/ui";
import { LIMITS, type OptionInput, type ProductOption } from "@/lib/admin/api/products";

export interface OptionDraft {
  key: string;
  name: string;
  values: string[];
}

let seq = 0;
export function newOptionKey(): string {
  seq += 1;
  return `op${Date.now().toString(36)}${seq}`;
}

export function draftsFromOptions(options: ProductOption[]): OptionDraft[] {
  return options.map((o) => ({ key: o.id, name: o.name, values: o.values.map((v) => v.value) }));
}

export function draftsToInput(drafts: OptionDraft[]): OptionInput[] {
  return drafts.map((o, i) => ({ name: o.name.trim(), position: i, values: o.values.map((v, j) => ({ value: v.trim(), position: j })) }));
}

export function comboCount(drafts: OptionDraft[]): number {
  if (drafts.length === 0) return 1;
  return drafts.reduce((acc, o) => acc * Math.max(1, o.values.length), 1);
}

/** Combinaciones de valores (producto cartesiano) en el orden de las opciones, para `variants[].optionValues`. */
export function valueCombos(drafts: OptionDraft[]): string[][] {
  return drafts.reduce<string[][]>((acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v.trim()])), [[]]);
}

/** Errores de las reglas del servidor (máx. 3 opciones, 100 valores, nombres y valores únicos, 100 variantes). */
export function validateOptions(drafts: OptionDraft[]): string | null {
  if (drafts.length > LIMITS.maxOptions) return `Un producto admite como máximo ${LIMITS.maxOptions} opciones.`;
  const names = new Set<string>();
  for (const o of drafts) {
    const name = o.name.trim();
    if (!name) return "Cada opción necesita un nombre.";
    if (name.length > 255) return `El nombre «${name.slice(0, 20)}…» supera 255 caracteres.`;
    if (names.has(name.toLowerCase())) return `La opción «${name}» está repetida.`;
    names.add(name.toLowerCase());
    if (o.values.length === 0) return `La opción «${name}» necesita al menos un valor.`;
    if (o.values.length > LIMITS.maxValuesPerOption) return `La opción «${name}» supera ${LIMITS.maxValuesPerOption} valores.`;
  }
  if (comboCount(drafts) > LIMITS.maxVariants) return `Las combinaciones (${comboCount(drafts)}) superan el máximo de ${LIMITS.maxVariants} variantes.`;
  return null;
}

interface Props {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
  readOnly?: boolean;
  error?: string | null;
}

export function OptionsEditor({ options, onChange, readOnly, error }: Props) {
  const set = (key: string, patch: Partial<OptionDraft>) => onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  return (
    <div className="flex flex-col gap-4">
      {options.map((o, i) => (
        <fieldset key={o.key} className="flex flex-col gap-3 rounded-md border border-border bg-surface-2/40 p-3">
          <legend className="px-1 text-xs text-muted">Opción {i + 1}</legend>
          <div className="flex items-end gap-2">
            <Input label="Nombre" value={o.name} maxLength={255} placeholder="Talla, Color…" disabled={readOnly} wrapperClassName="flex-1" onChange={(e) => set(o.key, { name: e.target.value })} />
            {!readOnly ? <IconButton label={`Quitar opción ${o.name || i + 1}`} variant="secondary" icon={<Trash2 aria-hidden size={15} />} onClick={() => onChange(options.filter((x) => x.key !== o.key))} /> : null}
          </div>
          <TagInput
            label="Valores"
            value={o.values}
            maxTags={LIMITS.maxValuesPerOption}
            maxLength={255}
            disabled={readOnly}
            placeholder="Escribe un valor y pulsa Enter (S, M, L…)"
            hint={`${o.values.length}/${LIMITS.maxValuesPerOption} valores`}
            onChange={(values) => set(o.key, { values })}
          />
        </fieldset>
      ))}
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} disabled={options.length >= LIMITS.maxOptions} onClick={() => onChange([...options, { key: newOptionKey(), name: "", values: [] }])}>
            Añadir opción
          </Button>
          <span className="text-xs text-muted">
            {options.length}/{LIMITS.maxOptions} opciones · {options.length ? `${comboCount(options)} combinaciones` : "sin opciones: una sola variante"}
          </span>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
