"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Trash2, X } from "lucide-react";
import { Button, Field, IconButton, Input, Tabs, Textarea, controlClasses, useFieldAria } from "@/components/admin/ui";
import { MediaPicker, type MediaPickerItem } from "@/components/admin/media/media-picker";
import { MediaThumb } from "@/components/admin/media/media-parts";
import { useCan } from "@/lib/admin/permissions";
import {
  useCollectionOptions,
  useMenuOptions,
  usePageOptions,
  useProductOptions,
  type RefOption,
} from "@/lib/admin/api/content";
import { cn } from "@/lib/admin/utils";
import { HEX_RE, HANDLE_RE, imageUrlError, linkError } from "./content-utils";
import { MarkdownPreview } from "./markdown";

/** Etiqueta con contador de caracteres a la derecha. */
export function labelWithCount(label: string, len: number, max?: number): ReactNode {
  if (!max) return label;
  const near = len > max * 0.9;
  return (
    <span className="inline-flex w-[calc(100%-1rem)] items-baseline justify-between gap-2">
      <span>{label}</span>
      <span className={cn("text-[11px] font-normal tabular-nums", near ? (len > max ? "text-danger" : "text-warning") : "text-muted")}>
        {len}/{max}
      </span>
    </span>
  );
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

interface BaseProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function TextField({ label, value, onChange, maxLength, multiline, rows, placeholder, ...rest }: BaseProps & { value: string; onChange: (v: string) => void; maxLength?: number; multiline?: boolean; rows?: number; placeholder?: string }) {
  const l = labelWithCount(label, value.length, maxLength);
  return multiline ? (
    <Textarea {...rest} label={l} value={value} rows={rows ?? 3} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <Input {...rest} label={l} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

export function LinkField({ label, value, onChange, ...rest }: BaseProps & { value: string; onChange: (v: string) => void }) {
  const local = value ? linkError(value) : null;
  return <Input {...rest} label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/collections/all o https://…" error={rest.error ?? local} hint={rest.hint ?? "https://…, una ruta (/…), mailto: o tel:"} inputMode="url" autoComplete="off" />;
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

export function ColorField({ label, value, onChange, onClear, error, hint, required, disabled, id }: BaseProps & { value: string | undefined; onChange: (v: string) => void; onClear?: () => void }) {
  const aria = useFieldAria(id, { hint, error, required });
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? "";
  const valid = HEX_RE.test(shown);
  const swatch = valid ? shown : HEX_RE.test(value ?? "") ? (value as string) : "#000000";
  const localError = draft !== null && !HEX_RE.test(draft) ? "Usa el formato #RRGGBB" : null;
  return (
    <Field label={label} hint={hint} error={error ?? localError} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: selector de color`}
          value={swatch}
          disabled={disabled}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface-2 p-0.5 disabled:cursor-not-allowed"
        />
        <input
          id={aria.id}
          value={shown}
          disabled={disabled}
          placeholder="#RRGGBB"
          maxLength={7}
          spellCheck={false}
          aria-describedby={aria["aria-describedby"]}
          aria-invalid={aria["aria-invalid"] ?? (localError ? true : undefined)}
          onChange={(e) => {
            let v = e.target.value.trim();
            if (v && !v.startsWith("#")) v = `#${v}`;
            setDraft(v);
            if (HEX_RE.test(v)) onChange(v);
          }}
          onBlur={() => setDraft(null)}
          className={cn(controlClasses, "h-9 w-28 font-mono uppercase")}
        />
        {onClear && value ? <IconButton label={`Quitar ${label.toLowerCase()}`} size="sm" icon={<X aria-hidden size={14} />} disabled={disabled} onClick={onClear} /> : null}
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Imagen                                                              */
/* ------------------------------------------------------------------ */

export function ImageField({ label, value, onChange, onPick, error, hint, required, disabled, id }: BaseProps & { value: string; onChange: (v: string) => void; onPick?: (item: MediaPickerItem) => void }) {
  const aria = useFieldAria(id, { hint, error, required });
  const [open, setOpen] = useState(false);
  const canBrowse = useCan("content:read");
  const local = value ? imageUrlError(value) : null;
  const err = error ?? local;
  return (
    <Field label={label} hint={hint} error={err} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId}>
      <div className="flex items-start gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2" data-testid="image-preview">
          {value && !local ? <MediaThumb url={value} alt="" className="size-16" /> : <div className="flex size-16 items-center justify-center text-muted"><ImagePlus aria-hidden size={20} /></div>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            id={aria.id}
            value={value}
            disabled={disabled}
            placeholder="https://… o /images/foto.jpg"
            aria-describedby={aria["aria-describedby"]}
            aria-invalid={aria["aria-invalid"] ?? (err ? true : undefined)}
            onChange={(e) => onChange(e.target.value)}
            className={cn(controlClasses, "h-9")}
          />
          <div className="flex flex-wrap gap-2">
            {canBrowse ? (
              <Button size="sm" disabled={disabled} leftIcon={<ImagePlus aria-hidden size={14} />} onClick={() => setOpen(true)}>
                {value ? "Cambiar imagen" : "Elegir de la biblioteca"}
              </Button>
            ) : null}
            {value && !required ? (
              <Button size="sm" variant="ghost" disabled={disabled} leftIcon={<Trash2 aria-hidden size={14} />} onClick={() => onChange("")}>
                Quitar
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(items) => {
          const it = items[0];
          if (!it) return;
          if (onPick) onPick(it);
          else onChange(it.url);
        }}
      />
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

export function MarkdownField({ label, value, onChange, maxLength, error, hint, required, disabled }: BaseProps & { value: string; onChange: (v: string) => void; maxLength?: number }) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const base = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <span className="text-[13px] font-medium">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </span>
        <span className={cn("text-[11px] tabular-nums", maxLength && value.length > maxLength ? "text-danger" : "text-muted")}>{maxLength ? `${value.length}/${maxLength}` : null}</span>
      </div>
      <Tabs
        tabs={[
          { key: "write", label: "Escribir" },
          { key: "preview", label: "Vista previa" },
        ]}
        value={tab}
        onChange={(k) => setTab(k === "preview" ? "preview" : "write")}
        base={base}
        aria-label={`Modo de ${label}`}
      />
      {tab === "write" ? (
        <Textarea aria-label={label} value={value} rows={8} disabled={disabled} error={error} onChange={(e) => onChange(e.target.value)} hint={hint ?? "Markdown: **negrita**, *cursiva*, [texto](https://…), listas con - y títulos con #. No se permite HTML."} />
      ) : (
        <div className="min-h-32 rounded-md border border-border bg-surface-2 p-3" data-testid="markdown-preview">
          <MarkdownPreview source={value} />
        </div>
      )}
      {tab === "preview" && error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Referencias (colección / producto / página / menú) con buscador      */
/* ------------------------------------------------------------------ */

export type RefKind = "collection" | "product" | "page" | "menu";

const REF_TEXT: Record<RefKind, { noun: string; placeholder: string }> = {
  collection: { noun: "colección", placeholder: "Busca una colección o escribe su handle" },
  product: { noun: "producto", placeholder: "Busca un producto por nombre" },
  page: { noun: "página", placeholder: "Busca una página" },
  menu: { noun: "menú", placeholder: "Elige un menú" },
};

function useRefOptions(kind: RefKind, query: string) {
  const col = useCollectionOptions(kind === "collection");
  const prod = useProductOptions(query, kind === "product");
  const page = usePageOptions(kind === "page");
  const menu = useMenuOptions(kind === "menu");
  return kind === "collection" ? col : kind === "product" ? prod : kind === "page" ? page : menu;
}

export function RefField({ kind, label, value, onChange, error, hint, required, disabled, id }: BaseProps & { kind: RefKind; value: string; onChange: (v: string) => void }) {
  const aria = useFieldAria(id, { hint, error, required });
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const query = useDebounced(value, 250);
  const opts = useRefOptions(kind, query);
  const all: RefOption[] = opts.data ?? [];
  const needle = value.trim().toLowerCase();
  const filtered = kind === "product" ? all : all.filter((o) => !needle || o.label.toLowerCase().includes(needle) || (o.hint ?? o.value).toLowerCase().includes(needle));
  const shown = filtered.slice(0, 30);
  const exact = all.find((o) => o.value === value);
  const text = REF_TEXT[kind];
  const known = !opts.isError && !opts.isPending;
  const missing = known && value !== "" && !exact && kind !== "product";
  const patternError = value && !HANDLE_RE.test(value) ? "Usa solo minúsculas, números y guiones" : null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (o: RefOption) => {
    onChange(o.value);
    setOpen(false);
  };

  return (
    <Field
      label={label}
      hint={hint ?? (exact ? `${text.noun[0].toUpperCase()}${text.noun.slice(1)}: ${exact.label}` : opts.isError ? `Escribe el handle de la ${text.noun} (no se pudo cargar la lista).` : undefined)}
      error={error ?? patternError ?? (missing ? `No existe ${kind === "collection" || kind === "page" ? "una" : "un"} ${text.noun} con ese handle` : null)}
      required={required}
      htmlFor={aria.id}
      hintId={aria.hintId}
      errorId={aria.errorId}
    >
      <div ref={wrap} className="relative">
        <div className="relative">
          <input
            id={aria.id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-describedby={aria["aria-describedby"]}
            aria-invalid={aria["aria-invalid"]}
            autoComplete="off"
            disabled={disabled}
            value={value}
            placeholder={text.placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, shown.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && open && shown[active]) {
                e.preventDefault();
                choose(shown[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className={cn(controlClasses, "h-9 pr-8")}
          />
          <ChevronDown aria-hidden size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
        </div>
        {open && !disabled ? (
          <ul id={listId} role="listbox" aria-label={`Resultados de ${text.noun}`} className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-strong bg-surface py-1 shadow-lg">
            {opts.isPending ? <li className="px-3 py-2 text-sm text-muted">Cargando…</li> : null}
            {opts.isError ? <li className="px-3 py-2 text-sm text-muted">No se pudo cargar la lista. Puedes escribir el handle a mano.</li> : null}
            {known && shown.length === 0 ? <li className="px-3 py-2 text-sm text-muted">Sin resultados</li> : null}
            {shown.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm", i === active ? "bg-surface-3" : "hover:bg-surface-2")}
                >
                  <span className="truncate">{o.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{o.hint ?? o.value}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
