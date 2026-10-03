"use client";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/admin/ui/Form";
import { Markdown } from "@/components/admin/ui/Markdown";
import { isApiMediaUrl, isSafeUrl, normalizeMediaUrls, useDocs, validateField, type CmsField as SchemaField, type JsonValue } from "@/lib/admin/api/content";
import { mediaUrl } from "@/lib/admin/api/media";
import { HandlePicker } from "./HandlePicker";
import { MediaPicker } from "./MediaPicker";

type Values = Record<string, JsonValue>;
interface Props { fields: SchemaField[]; values: Values; onChange: (v: Values) => void; errors?: Record<string, string>; prefix?: string }

/** Formulario generado desde la definición (JSON Schema simplificado) de una sección o bloque. */
export function SchemaForm({ fields, values, onChange, errors = {}, prefix = "" }: Props) {
  const set = (k: string, v: JsonValue) => onChange({ ...values, [k]: v });
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldInput key={f.key} f={f} value={values[f.key] ?? f.default} onChange={(v) => set(f.key, v)} error={errors[`${prefix}${f.key}`] ?? validateField(f, values[f.key])} />
      ))}
    </div>
  );
}

function FieldInput({ f, value, onChange, error }: { f: SchemaField; value: JsonValue | undefined; onChange: (v: JsonValue) => void; error?: string }) {
  const str = typeof value === "string" ? value : "";
  const counter = f.maxLength ? `${str.length}/${f.maxLength}` : undefined;
  const hint = [f.hint, counter].filter(Boolean).join(" · ") || undefined;
  const lbl = f.label + (f.required && f.default === undefined ? " *" : "");
  switch (f.type) {
    case "string": case "url":
      return <Input label={lbl} value={str} error={error} hint={f.type === "url" ? "https://, /ruta, mailto: o tel:" : hint} onChange={(e) => onChange(e.target.value)} />;
    case "text": return <Textarea label={lbl} rows={f.key === "heading" ? 2 : 3} value={str} error={error} hint={hint} onChange={(e) => onChange(e.target.value)} />;
    case "markdown": return <MarkdownField f={f} value={str} error={error} onChange={onChange} />;
    case "number": return <Input label={lbl} type="number" step={f.integer ? 1 : f.max !== undefined && f.max <= 1 ? 0.05 : 1} min={f.min} max={f.max} value={typeof value === "number" ? value : ""} error={error} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
    case "boolean": return <Checkbox label={f.label} checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
    case "enum": return <Select label={lbl} value={str} error={error} onChange={(e) => onChange(e.target.value)}>{!(f.required || f.default !== undefined) && <option value="">—</option>}{f.options?.map((o) => <option key={o}>{o}</option>)}</Select>;
    case "menu": return <MenuField f={f} value={str} error={error} onChange={onChange} />;
    case "stringList": return <StringListField f={f} value={Array.isArray(value) ? (value as string[]) : []} error={error} onChange={onChange} />;
    case "color": return (
      <Field label={f.label} error={error} hint={f.hint}><div className="flex items-center gap-2"><input type="color" aria-label={`${f.label} (selector)`} value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"} onChange={(e) => onChange(e.target.value)} className="size-9 cursor-pointer rounded border border-line bg-transparent p-0.5" /><Input aria-label={f.label} value={str} placeholder="#000000" onChange={(e) => onChange(e.target.value)} /></div></Field>
    );
    case "image": return <ImageField f={f} value={str} error={error} onChange={onChange} />;
    case "collection": case "product": return <HandlePicker kind={f.type} label={f.label} required={f.required} value={str} error={error} onChange={onChange} />;
    case "links": return <LinksField f={f} value={Array.isArray(value) ? (value as { label: string; url: string }[]) : []} error={error} onChange={onChange} />;
  }
}

function MarkdownField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const [prev, setPrev] = useState(false);
  return (
    <Field label={f.label + (f.required ? " *" : "")} error={error} hint={f.maxLength ? `${value.length}/${f.maxLength} · solo Markdown, sin HTML` : undefined}>
      <div className="flex justify-end"><button type="button" className="text-xs text-accent-text hover:underline" onClick={() => setPrev(!prev)}>{prev ? "Editar" : "Vista previa"}</button></div>
      {prev ? <div className="min-h-24 rounded-sm border border-line p-3"><Markdown source={value || "_Vacío_"} /></div> : <Textarea aria-label={f.label} rows={6} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
function ImageField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={f.label + (f.required && f.default === undefined ? " *" : "")} error={error}>
      <div className="flex items-center gap-2">
        {value && (isSafeUrl(value, false) || isApiMediaUrl(value)) && <Image src={mediaUrl(value)} alt="" width={44} height={44} unoptimized className="size-11 rounded object-cover" />}
        <Input aria-label={f.label} value={value} placeholder="https://… o /ruta" onChange={(e) => onChange(normalizeMediaUrls(e.target.value) as string)} />
        <Button icon={<ImagePlus className="size-4" />} onClick={() => setOpen(true)}>Elegir</Button>
        {value && <IconButton label="Quitar imagen" onClick={() => onChange("")}><Trash2 className="size-4" /></IconButton>}
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={([m]) => m && onChange(normalizeMediaUrls(m.url) as string)} />
    </Field>
  );
}
function MenuField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const menus = useDocs().data?.filter((d) => d.kind === "menu") ?? [];
  return (
    <Select label={f.label} value={value} error={error} onChange={(e) => onChange(e.target.value)}>
      {!f.default && <option value="">—</option>}
      {value && !menus.some((m) => m.key === value) && <option value={value}>{value}</option>}
      {menus.map((m) => <option key={m.key} value={m.key}>{m.title}</option>)}
    </Select>
  );
}
function StringListField({ f, value, error, onChange }: { f: SchemaField; value: string[]; error?: string; onChange: (v: JsonValue) => void }) {
  return (
    <Field label={f.label} error={error} hint={f.maxItems ? `${value.length}/${f.maxItems}` : undefined}>
      <div className="space-y-2">
        {value.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <Input aria-label={`${f.label} ${i + 1}`} value={l} maxLength={f.itemMaxLength} onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))} />
            <IconButton label={`Quitar ${f.label} ${i + 1}`} onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 className="size-4" /></IconButton>
          </div>
        ))}
        <Button size="sm" icon={<Plus className="size-4" />} disabled={!!f.maxItems && value.length >= f.maxItems} onClick={() => onChange([...value, ""])}>Añadir línea</Button>
      </div>
    </Field>
  );
}
function LinksField({ f, value, error, onChange }: { f: SchemaField; value: { label: string; url: string }[]; error?: string; onChange: (v: JsonValue) => void }) {
  return (
    <Field label={f.label} error={error} hint={f.maxItems ? `${value.length}/${f.maxItems}` : undefined}>
      <div className="space-y-2">
        {value.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <Input aria-label="Texto del enlace" placeholder="Texto" value={l.label} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
            <Input aria-label="URL del enlace" placeholder="/ruta o https://" value={l.url} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
            <IconButton label="Quitar enlace" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 className="size-4" /></IconButton>
          </div>
        ))}
        <Button size="sm" icon={<Plus className="size-4" />} disabled={!!f.maxItems && value.length >= f.maxItems} onClick={() => onChange([...value, { label: "", url: "" }])}>Añadir enlace</Button>
      </div>
    </Field>
  );
}
