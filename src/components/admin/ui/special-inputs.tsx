"use client";

import { useState, type KeyboardEvent, type Ref } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { formatCop } from "@/lib/admin/format";
import { Field, controlClasses, useFieldAria, type FieldChrome } from "./field";

/* ---------------- MoneyInput ---------------- */

export interface MoneyInputProps extends FieldChrome {
  /** COP entero (sin decimales) o null si está vacío. */
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Entrada de dinero en COP entero: muestra "$189.000" al salir y los dígitos puros al editar. */
export function MoneyInput({ value, onChange, label, hint, error, required, placeholder = "$0", disabled, id, name, min = 0, max = 1_000_000_000, className, ref }: MoneyInputProps) {
  const aria = useFieldAria(id, { hint, error, required });
  const [draft, setDraft] = useState<string | null>(null); // null = no editando
  const shown = draft ?? (value === null ? "" : formatCop(value));

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return onChange(null);
    const n = Math.min(max, Math.max(min, parseInt(digits, 10)));
    onChange(n);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={className}>
      <input
        ref={ref}
        id={aria.id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        className={cn(controlClasses, "h-9 tabular-nums")}
        value={shown}
        onFocus={() => setDraft(value === null ? "" : String(value))}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setDraft(digits);
          commit(digits);
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

/* ---------------- DateTimeInput ---------------- */

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000; // Colombia: UTC-5 sin horario de verano

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 16);
}

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(`${local}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface DateTimeInputProps extends FieldChrome {
  /** ISO 8601 (UTC) o null. La edición se interpreta en hora de Bogotá. */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** ISO mínimo permitido (p. ej. ahora, para programar). */
  min?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

export function DateTimeInput({ value, onChange, label, hint, error, required, min, disabled, id, className, ref }: DateTimeInputProps) {
  const aria = useFieldAria(id, { hint, error, required });
  return (
    <Field label={label} hint={hint ?? "Hora de Colombia (UTC-5)"} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={className}>
      <input
        ref={ref}
        id={aria.id}
        type="datetime-local"
        disabled={disabled}
        required={required}
        min={min ? isoToLocal(min) : undefined}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        className={cn(controlClasses, "h-9")}
        value={isoToLocal(value)}
        onChange={(e) => onChange(localToIso(e.target.value))}
      />
    </Field>
  );
}

/* ---------------- TagInput ---------------- */

export interface TagInputProps extends FieldChrome {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function TagInput({ value, onChange, suggestions, label, hint, error, required, placeholder = "Escribe y pulsa Enter", maxTags = 50, maxLength = 60, disabled, id, className }: TagInputProps) {
  const aria = useFieldAria(id, { hint, error, required });
  const [text, setText] = useState("");
  const listId = `${aria.id}-list`;

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((t) => t.trim().slice(0, maxLength))
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= maxTags) break;
      if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={className}>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2 py-1.5 focus-within:border-focus",
          error && "border-danger",
          disabled && "opacity-60",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface-3 py-0.5 pr-1 pl-2.5 text-xs">
            {tag}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Quitar etiqueta ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="flex size-4 items-center justify-center rounded-full text-muted hover:bg-border-strong hover:text-text"
            >
              <X aria-hidden size={12} />
            </button>
          </span>
        ))}
        <input
          id={aria.id}
          value={text}
          list={suggestions?.length ? listId : undefined}
          disabled={disabled || value.length >= maxTags}
          placeholder={value.length ? "" : placeholder}
          aria-describedby={aria["aria-describedby"]}
          aria-invalid={aria["aria-invalid"]}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(text)}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted/80"
        />
        {suggestions?.length ? (
          <datalist id={listId}>
            {suggestions.filter((s) => !value.includes(s)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
      </div>
    </Field>
  );
}
