"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Select, Switch } from "@/components/admin/ui";
import type { JsonSchema } from "@/lib/admin/api/content";
import type { MediaPickerItem } from "@/components/admin/media/media-picker";
import { cn } from "@/lib/admin/utils";
import { buildDefaults, classifyString, enumLabel, errorsUnder, humanizeKey, isObj, moveItem, type Obj } from "./content-utils";
import { ColorField, ImageField, LinkField, MarkdownField, RefField, TextField } from "./fields";
import { SortableList, SortableRow } from "./sortable";

type ErrorMap = Record<string, string>;

interface SchemaFormProps {
  schema: JsonSchema;
  value: Obj;
  onChange: (value: Obj) => void;
  /** Errores del servidor: clave = ruta completa del documento (p. ej. `sections.0.settings.title`). */
  errors?: ErrorMap;
  /** Ruta del documento donde vive `value` (p. ej. `sections.0.settings`). */
  path?: string;
  disabled?: boolean;
}

/** Formulario generado desde un JSON Schema (el `settingsSchema` de cada sección o el `schema` de cada block). */
export function SchemaForm({ schema, value, onChange, errors = {}, path = "", disabled }: SchemaFormProps) {
  return <ObjectFields schema={schema} value={value} onChange={onChange} errors={errors} path={path} disabled={disabled} depth={0} />;
}

interface ObjectFieldsProps {
  schema: JsonSchema;
  value: Obj;
  onChange: (v: Obj) => void;
  errors: ErrorMap;
  path: string;
  disabled?: boolean;
  depth: number;
}

const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key));

function ObjectFields({ schema, value, onChange, errors, path, disabled, depth }: ObjectFieldsProps) {
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {});
  const set = (name: string, v: unknown) => {
    const next: Obj = { ...value };
    if (v === undefined) delete next[name];
    else next[name] = v;
    onChange(next);
  };

  const pickImage = (name: string, item: MediaPickerItem) => {
    const next: Obj = { ...value, [name]: item.url };
    const base = name.replace(/(Media)?Url$/, "");
    const altKey = [`${base}Alt`, "alt", "imageAlt"].find((k) => schema.properties?.[k]);
    if (altKey && item.alt && !(typeof value[altKey] === "string" && (value[altKey] as string).trim())) next[altKey] = item.alt;
    onChange(next);
  };

  return (
    <div className={cn("flex flex-col gap-4", depth > 0 && "pt-1")}>
      {props.map(([name, prop]) => (
        <FieldNode
          key={name}
          name={name}
          schema={prop}
          value={value[name]}
          required={required.has(name) && prop.default === undefined}
          onChange={(v) => set(name, v)}
          onPickImage={(item) => pickImage(name, item)}
          errors={errors}
          path={join(path, name)}
          disabled={disabled}
          depth={depth}
        />
      ))}
    </div>
  );
}

interface FieldNodeProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  required: boolean;
  onChange: (v: unknown) => void;
  onPickImage?: (item: MediaPickerItem) => void;
  errors: ErrorMap;
  path: string;
  disabled?: boolean;
  depth: number;
  /** Etiqueta explícita (elementos de listas). */
  label?: string;
}

function FieldNode({ name, schema, value, required, onChange, onPickImage, errors, path, disabled, depth, label: labelProp }: FieldNodeProps) {
  const label = labelProp ?? humanizeKey(name);
  const error = errors[path] ?? null;
  const id = `f-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;

  switch (schema.type) {
    case "boolean":
      return <Switch id={id} checked={typeof value === "boolean" ? value : schema.default === true} onChange={(v) => onChange(v)} label={label} disabled={disabled} />;

    case "number":
    case "integer":
      return <NumberField id={id} label={label} schema={schema} value={typeof value === "number" ? value : undefined} required={required} onChange={onChange} error={error} disabled={disabled} />;

    case "string": {
      const str = typeof value === "string" ? value : "";
      const emit = (v: string) => onChange(v === "" && !required ? undefined : v);
      if (schema.enum && schema.enum.length) {
        const opts = schema.enum.map((e) => ({ value: String(e), label: enumLabel(String(e)) }));
        const current = typeof value === "string" ? value : schema.default !== undefined ? String(schema.default) : "";
        return (
          <Select
            id={id}
            label={label}
            value={current}
            required={required}
            disabled={disabled}
            error={error}
            onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
            options={required || schema.default !== undefined ? opts : [{ value: "", label: "— Sin definir —" }, ...opts]}
          />
        );
      }
      const kind = classifyString(name, schema);
      const shownValue = typeof value === "string" ? value : schema.default !== undefined ? String(schema.default) : "";
      switch (kind) {
        case "color":
          return <ColorField id={id} label={label} value={typeof value === "string" ? value : undefined} required={required} disabled={disabled} error={error} onChange={(v) => onChange(v)} onClear={required ? undefined : () => onChange(undefined)} />;
        case "image":
          return <ImageField id={id} label={label} value={str} required={required} disabled={disabled} error={error} onChange={emit} onPick={onPickImage} />;
        case "link":
          return <LinkField id={id} label={label} value={str} required={required} disabled={disabled} error={error} onChange={emit} />;
        case "markdown":
          return <MarkdownField label={label} value={str} maxLength={schema.maxLength} required={required} disabled={disabled} error={error} onChange={emit} />;
        case "ref-collection":
        case "ref-product":
        case "ref-menu":
        case "ref-page":
          return <RefField id={id} kind={kind.slice(4) as "collection" | "product" | "menu" | "page"} label={label} value={shownValue} required={required} disabled={disabled} error={error} onChange={emit} />;
        case "textarea":
          return <TextField id={id} label={label} value={str} maxLength={schema.maxLength} multiline rows={name === "heading" ? 2 : 3} required={required} disabled={disabled} error={error} onChange={emit} hint={name === "heading" ? "Usa Enter para separar líneas." : undefined} />;
        case "handle":
        default:
          return <TextField id={id} label={label} value={shownValue} maxLength={schema.maxLength} required={required} disabled={disabled} error={error} onChange={emit} placeholder={schema.default !== undefined ? String(schema.default) : undefined} />;
      }
    }

    case "array":
      return <ArrayField name={name} label={label} schema={schema} value={Array.isArray(value) ? value : []} onChange={onChange} errors={errors} path={path} disabled={disabled} depth={depth} />;

    case "object":
      return (
        <Group label={label} errorCount={errorsUnder(errors, path)} defaultOpen={depth < 1 || errorsUnder(errors, path) > 0}>
          <ObjectFields schema={schema} value={isObj(value) ? value : {}} onChange={(v) => onChange(v)} errors={errors} path={path} disabled={disabled} depth={depth + 1} />
        </Group>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

function Group({ label, children, errorCount, defaultOpen }: { label: string; children: ReactNode; errorCount: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = open || errorCount > 0;
  return (
    <div className="rounded-lg border border-border">
      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-surface-2">
        <ChevronRight aria-hidden size={15} className={cn("transition-transform", isOpen && "rotate-90")} />
        {label}
        {errorCount > 0 ? <Badge tone="danger">{errorCount} error{errorCount === 1 ? "" : "es"}</Badge> : null}
      </button>
      {isOpen ? <div className="border-t border-border px-3 py-3">{children}</div> : null}
    </div>
  );
}

function NumberField({ id, label, schema, value, required, onChange, error, disabled }: { id: string; label: string; schema: JsonSchema; value: number | undefined; required: boolean; onChange: (v: unknown) => void; error: string | null; disabled?: boolean }) {
  const min = schema.minimum;
  const max = schema.maximum;
  const isRange = min !== undefined && max !== undefined && max - min <= 1;
  const current = value ?? (typeof schema.default === "number" ? schema.default : undefined);
  const integer = schema.type === "integer";
  const range = min !== undefined && max !== undefined ? `${min}–${max}` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div className="flex items-center gap-3">
        {isRange ? (
          <input
            type="range"
            aria-label={`${label} (control deslizante)`}
            min={min}
            max={max}
            step={0.05}
            value={current ?? min}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
          />
        ) : null}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={integer ? 1 : isRange ? 0.05 : "any"}
          value={current ?? ""}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            if (e.target.value === "") return onChange(required ? undefined : undefined);
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(integer ? Math.trunc(n) : n);
          }}
          className={cn("h-9 rounded-md border border-border-strong bg-surface-2 px-3 text-sm tabular-nums focus:border-focus focus:outline-none aria-[invalid=true]:border-danger", isRange ? "w-24" : "w-full")}
        />
      </div>
      {range ? <p className="text-xs text-muted">Entre {range}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ArrayField({ name, label, schema, value, onChange, errors, path, disabled, depth }: { name: string; label: string; schema: JsonSchema; value: unknown[]; onChange: (v: unknown) => void; errors: ErrorMap; path: string; disabled?: boolean; depth: number }) {
  const item = schema.items ?? { type: "string" };
  const max = schema.maxItems;
  const canAdd = !disabled && (max === undefined || value.length < max);
  const ids = value.map((_, i) => `${path}#${i}`);
  const arrErr = errors[path];
  const itemName = name.endsWith("s") ? name.slice(0, -1) : name;
  const isObjItem = item.type === "object";

  const add = () => {
    const nv = isObjItem ? buildDefaults(item) : item.type === "number" || item.type === "integer" ? 0 : "";
    onChange([...value, nv]);
  };
  const update = (i: number, v: unknown) => onChange(value.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="flex w-full items-center justify-between gap-2 text-[13px] font-medium">
        <span>
          {label}
          <span className="ml-2 text-xs font-normal text-muted">
            {value.length}
            {max ? `/${max}` : ""}
          </span>
        </span>
      </legend>
      {value.length === 0 ? <p className="text-xs text-muted">Sin elementos todavía.</p> : null}
      <SortableList ids={ids} onReorder={(from, to) => onChange(moveItem(value, from, to))} className="flex flex-col gap-2" aria-label={label}>
        {value.map((v, i) => (
          <SortableRow key={ids[i]} id={ids[i]}>
            {(handle) => (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/50 p-2">
                {disabled ? null : <div className="pt-1">{handle}</div>}
                <div className="min-w-0 flex-1">
                  {isObjItem ? (
                    <ObjectFields schema={item} value={isObj(v) ? v : {}} onChange={(nv) => update(i, nv)} errors={errors} path={join(path, i)} disabled={disabled} depth={depth + 1} />
                  ) : (
                    <FieldNode name={itemName} label={`${humanizeKey(itemName)} ${i + 1}`} schema={item} value={v} required onChange={(nv) => update(i, nv ?? "")} errors={errors} path={join(path, i)} disabled={disabled} depth={depth + 1} />
                  )}
                </div>
                {disabled ? null : <IconButton label={`Subir ${itemName} ${i + 1}`} size="sm" icon={<ArrowUp aria-hidden size={14} />} disabled={i === 0} onClick={() => onChange(moveItem(value, i, i - 1))} />}
                {disabled ? null : <IconButton label={`Bajar ${itemName} ${i + 1}`} size="sm" icon={<ArrowDown aria-hidden size={14} />} disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, i + 1))} />}
                {disabled ? null : <IconButton label={`Quitar ${itemName} ${i + 1}`} size="sm" icon={<Trash2 aria-hidden size={14} />} onClick={() => remove(i)} />}
              </div>
            )}
          </SortableRow>
        ))}
      </SortableList>
      {arrErr ? (
        <p role="alert" className="text-xs text-danger">
          {arrErr}
        </p>
      ) : null}
      {canAdd ? (
        <div>
          <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} onClick={add}>
            Añadir {itemName}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
