"use client";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/admin/ui/Form";
import { Markdown } from "@/components/admin/ui/Markdown";
import { useAllProducts, useCollections } from "@/lib/admin/api/catalog";
import { validateField } from "@/lib/admin/api/content";
import type { JsonValue, SchemaField } from "@/lib/admin/types";
import { MediaPicker } from "./MediaPicker";

type Values = Record<string, JsonValue>;
interface Props { fields: SchemaField[]; values: Values; onChange: (v: Values) => void; errors?: Record<string, string>; prefix?: string }

/** Formulario generado desde la definición (JSON Schema simplificado) de una sección o bloque. */
export function SchemaForm({ fields, values, onChange, errors = {}, prefix = "" }: Props) {
  const set = (k: string, v: JsonValue) => onChange({ ...values, [k]: v });
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldInput key={f.key} f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} error={errors[`${prefix}${f.key}`] ?? validateField(f, values[f.key])} />
      ))}
    </div>
  );
}

function FieldInput({ f, value, onChange, error }: { f: SchemaField; value: JsonValue | undefined; onChange: (v: JsonValue) => void; error?: string }) {
  const str = typeof value === "string" ? value : "";
  const counter = f.max ? `${str.length}/${f.max}` : undefined;
  switch (f.type) {
    case "string": case "url":
      return <Input label={f.label + (f.required ? " *" : "")} value={str} error={error} hint={f.type === "url" ? "https://, /ruta, mailto: o tel:" : counter} onChange={(e) => onChange(e.target.value)} />;
    case "text": return <Textarea label={f.label} rows={3} value={str} error={error} hint={counter} onChange={(e) => onChange(e.target.value)} />;
    case "markdown": return <MarkdownField f={f} value={str} error={error} onChange={onChange} />;
    case "number": return <Input label={f.label} type="number" step={f.maxValue !== undefined && f.maxValue <= 1 ? 0.05 : 1} value={typeof value === "number" ? value : ""} error={error} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
    case "boolean": return <Checkbox label={f.label} checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
    case "enum": return <Select label={f.label} value={str} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</Select>;
    case "color": return (
      <Field label={f.label} error={error}><div className="flex items-center gap-2"><input type="color" aria-label={`${f.label} (selector)`} value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"} onChange={(e) => onChange(e.target.value)} className="size-9 cursor-pointer rounded border border-line bg-transparent p-0.5" /><Input aria-label={f.label} value={str} placeholder="#000000" onChange={(e) => onChange(e.target.value)} /></div></Field>
    );
    case "image": return <ImageField f={f} value={str} error={error} onChange={onChange} />;
    case "collection": case "product": return <HandleField f={f} value={str} error={error} onChange={onChange} />;
    case "links": return <LinksField f={f} value={Array.isArray(value) ? (value as { label: string; url: string }[]) : []} error={error} onChange={onChange} />;
  }
}

function MarkdownField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const [prev, setPrev] = useState(false);
  return (
    <Field label={f.label + (f.required ? " *" : "")} error={error} hint={f.max ? `${value.length}/${f.max} · solo Markdown, sin HTML` : undefined}>
      <div className="flex justify-end"><button type="button" className="text-xs text-accent-text hover:underline" onClick={() => setPrev(!prev)}>{prev ? "Editar" : "Vista previa"}</button></div>
      {prev ? <div className="min-h-24 rounded-sm border border-line p-3"><Markdown source={value || "_Vacío_"} /></div> : <Textarea aria-label={f.label} rows={6} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
function ImageField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={f.label + (f.required ? " *" : "")} error={error}>
      <div className="flex items-center gap-2">
        {value && <Image src={value} alt="" width={44} height={44} unoptimized className="size-11 rounded object-cover" />}
        <Input aria-label={f.label} value={value.startsWith("data:") ? "(imagen de la biblioteca)" : value} readOnly={value.startsWith("data:")} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
        <Button icon={<ImagePlus className="size-4" />} onClick={() => setOpen(true)}>Elegir</Button>
        {value && <IconButton label="Quitar imagen" onClick={() => onChange("")}><Trash2 className="size-4" /></IconButton>}
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={([m]) => m && onChange(m.url)} />
    </Field>
  );
}
function HandleField({ f, value, error, onChange }: { f: SchemaField; value: string; error?: string; onChange: (v: JsonValue) => void }) {
  const cols = useCollections().data ?? [], prods = useAllProducts().data ?? [];
  const [q, setQ] = useState(""), [focus, setFocus] = useState(false);
  const opts = (f.type === "collection" ? cols.map((c) => ({ h: c.handle, t: c.title })) : prods.map((p) => ({ h: p.handle, t: p.title }))).filter((o) => !q || o.t.toLowerCase().includes(q.toLowerCase()) || o.h.includes(q.toLowerCase())).slice(0, 6);
  const current = [...cols.map((c) => ({ h: c.handle, t: c.title })), ...prods.map((p) => ({ h: p.handle, t: p.title }))].find((o) => o.h === value);
  return (
    <Field label={f.label + (f.required ? " *" : "")} error={error} hint={current ? current.t : value ? "No coincide con ningún elemento existente" : undefined}>
      <div className="relative">
        <Input aria-label={f.label} value={focus ? q : value} placeholder={`Buscar ${f.type === "collection" ? "colección" : "producto"}…`} onFocus={() => { setFocus(true); setQ(""); }} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={(e) => { setQ(e.target.value); onChange(e.target.value); }} />
        {focus && opts.length > 0 && <ul role="listbox" className="absolute z-20 mt-1 w-full rounded-sm border border-line bg-surface p-1 shadow-xl">{opts.map((o) => <li key={o.h}><button type="button" role="option" aria-selected={o.h === value} className="flex w-full justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-surface2" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o.h); setFocus(false); }}><span>{o.t}</span><span className="text-xs text-muted">{o.h}</span></button></li>)}</ul>}
      </div>
    </Field>
  );
}
function LinksField({ f, value, error, onChange }: { f: SchemaField; value: { label: string; url: string }[]; error?: string; onChange: (v: JsonValue) => void }) {
  return (
    <Field label={f.label} error={error}>
      <div className="space-y-2">
        {value.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <Input aria-label="Texto del enlace" placeholder="Texto" value={l.label} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
            <Input aria-label="URL del enlace" placeholder="/ruta o https://" value={l.url} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
            <IconButton label="Quitar enlace" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 className="size-4" /></IconButton>
          </div>
        ))}
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => onChange([...value, { label: "", url: "" }])}>Añadir enlace</Button>
      </div>
    </Field>
  );
}
