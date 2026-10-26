"use client";
import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const base = "w-full rounded-sm border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted/70 focus:border-accent disabled:opacity-50";
const err = "border-accent";
/** `aria-describedby` hacia el mensaje (error o ayuda) que `Field` pinta con id `${control}-msg`. */
const described = (id: string, hint?: string, error?: string) => (error || hint ? `${id}-msg` : undefined);

export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: string; error?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="adm-label !text-fg">{label}</label>
      {children}
      {error ? <p id={htmlFor ? `${htmlFor}-msg` : undefined} role="alert" className="text-xs text-accent-text">{error}</p> : hint ? <p id={htmlFor ? `${htmlFor}-msg` : undefined} className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

type FP = { label?: string; hint?: string; error?: string };
export function Input({ label, hint, error, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & FP) {
  const gid = useId(); const i = id ?? gid;
  const el = <input id={i} aria-invalid={!!error || undefined} aria-describedby={described(i, hint, error)} className={clsx(base, "h-9", error && err, className)} {...rest} />;
  return label ? <Field label={label} hint={hint} error={error} htmlFor={i}>{el}</Field> : el;
}
export function Textarea({ label, hint, error, className, id, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FP) {
  const gid = useId(); const i = id ?? gid;
  const el = <textarea id={i} rows={rows} aria-invalid={!!error || undefined} aria-describedby={described(i, hint, error)} className={clsx(base, "py-2", error && err, className)} {...rest} />;
  return label ? <Field label={label} hint={hint} error={error} htmlFor={i}>{el}</Field> : el;
}
export function Select({ label, hint, error, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FP) {
  const gid = useId(); const i = id ?? gid;
  const el = <select id={i} aria-invalid={!!error || undefined} aria-describedby={described(i, hint, error)} className={clsx(base, "h-9", error && err, className)} {...rest}>{children}</select>;
  return label ? <Field label={label} hint={hint} error={error} htmlFor={i}>{el}</Field> : el;
}
export function Checkbox({ label, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string }) {
  return (
    <label className={clsx("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input type="checkbox" className="size-[18px] accent-[var(--adm-accent)]" {...rest} />
      {label}
    </label>
  );
}
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={clsx("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full before:absolute before:-inset-3 before:content-[''] disabled:opacity-50", checked ? "bg-accent" : "bg-line")}>
      <span className={clsx("inline-block size-4 rounded-full bg-white transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/** Dinero en COP entero; formatea al salir del campo. */
export function MoneyInput({ value, onChange, label, error, hint, disabled }: { value: number | undefined; onChange: (v: number | undefined) => void; label?: string; error?: string; hint?: string; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [txt, setTxt] = useState("");
  const shown = focused ? txt : value === undefined ? "" : `$${new Intl.NumberFormat("es-CO").format(value)}`;
  return (
    <Input label={label} error={error} hint={hint} disabled={disabled} inputMode="numeric" value={shown} placeholder="$0"
      onFocus={() => { setFocused(true); setTxt(value === undefined ? "" : String(value)); }}
      onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setTxt(d); onChange(d === "" ? undefined : Number(d)); }}
      onBlur={() => setFocused(false)} />
  );
}
/** Fecha y hora en la zona del negocio (Colombia, UTC−5, sin horario de verano), sin depender de la zona del navegador. `value` es ISO. */
const BOGOTA_OFFSET_MS = 5 * 3_600_000;
export const isoToBogotaLocal = (iso: string): string => { const t = new Date(iso).getTime(); return Number.isNaN(t) ? "" : new Date(t - BOGOTA_OFFSET_MS).toISOString().slice(0, 16); };
export const bogotaLocalToIso = (local: string): string | null => { const d = new Date(`${local}:00-05:00`); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
export function DateTimeInput({ value, onChange, label, error }: { value: string | null; onChange: (iso: string | null) => void; label?: string; error?: string }) {
  return <Input type="datetime-local" label={label} error={error} hint="Hora de Colombia (UTC−5)" value={value ? isoToBogotaLocal(value) : ""} onChange={(e) => onChange(e.target.value ? bogotaLocalToIso(e.target.value) : null)} />;
}
export function TagInput({ value, onChange, label, placeholder = "Escribe y pulsa Enter" }: { value: string[]; onChange: (v: string[]) => void; label?: string; placeholder?: string }) {
  const [txt, setTxt] = useState("");
  const id = useId();
  const add = () => { const t = txt.trim().toLowerCase(); if (t && !value.includes(t)) onChange([...value, t]); setTxt(""); };
  const el = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-line bg-surface p-1.5 focus-within:border-accent">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-sm bg-surface2 px-2 py-0.5 text-xs">
          {t}
          <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="-m-1.5 p-2 text-muted hover:text-fg"><X className="size-3" /></button>
        </span>
      ))}
      <input id={id} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !txt && value.length) onChange(value.slice(0, -1)); }}
        onBlur={add} className="min-h-9 min-w-24 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none" />
    </div>
  );
  return label ? <Field label={label} htmlFor={id}>{el}</Field> : el;
}
/** Búsqueda con debounce de 300 ms. */
export function SearchInput({ onSearch, placeholder = "Buscar…", className }: { onSearch: (q: string) => void; placeholder?: string; className?: string }) {
  const [v, setV] = useState("");
  useEffect(() => { const t = setTimeout(() => onSearch(v), 300); return () => clearTimeout(t); }, [v, onSearch]);
  return (
    <div className={clsx("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" aria-label={placeholder} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className={clsx(base, "h-9 pl-8")} />
    </div>
  );
}
