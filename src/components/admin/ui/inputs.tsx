"use client";

import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Field, controlClasses, useFieldAria, type FieldChrome } from "./field";

/* ---------------- Input ---------------- */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, FieldChrome {
  leftIcon?: ReactNode;
  rightAddon?: ReactNode;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, required, leftIcon, rightAddon, className, wrapperClassName, id, ref, ...rest }: InputProps) {
  const aria = useFieldAria(id, { hint, error, required });
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={wrapperClassName}>
      <div className="relative flex items-center">
        {leftIcon ? <span className="pointer-events-none absolute left-3 flex text-muted">{leftIcon}</span> : null}
        <input
          ref={ref}
          id={aria.id}
          required={required}
          aria-describedby={aria["aria-describedby"]}
          aria-invalid={aria["aria-invalid"]}
          className={cn(controlClasses, "h-9", leftIcon && "pl-9", rightAddon && "pr-10", className)}
          {...rest}
        />
        {rightAddon ? <span className="absolute right-2 flex items-center text-muted">{rightAddon}</span> : null}
      </div>
    </Field>
  );
}

/* ---------------- Textarea ---------------- */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChrome {
  wrapperClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, hint, error, required, className, wrapperClassName, id, rows = 4, ref, ...rest }: TextareaProps) {
  const aria = useFieldAria(id, { hint, error, required });
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={aria.id}
        rows={rows}
        required={required}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        className={cn(controlClasses, "py-2 leading-relaxed", className)}
        {...rest}
      />
    </Field>
  );
}

/* ---------------- Select ---------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, FieldChrome {
  /** Alternativa a `children` (<option>). */
  options?: SelectOption[];
  wrapperClassName?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ label, hint, error, required, options, children, className, wrapperClassName, id, ref, ...rest }: SelectProps) {
  const aria = useFieldAria(id, { hint, error, required });
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={aria.id} hintId={aria.hintId} errorId={aria.errorId} className={wrapperClassName}>
      <select
        ref={ref}
        id={aria.id}
        required={required}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        className={cn(controlClasses, "h-9 cursor-pointer pr-8", className)}
        {...rest}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </Field>
  );
}

/* ---------------- Checkbox ---------------- */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size">, Pick<FieldChrome, "hint" | "error"> {
  label?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({ label, hint, error, className, id, ref, ...rest }: CheckboxProps) {
  const aria = useFieldAria(id, { hint, error });
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={aria.id} className="inline-flex cursor-pointer items-start gap-2.5 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={aria.id}
            type="checkbox"
            aria-describedby={aria["aria-describedby"]}
            aria-invalid={aria["aria-invalid"]}
            className="peer absolute inset-0 m-0 size-4 cursor-pointer appearance-none rounded-[4px] border border-border-strong bg-surface-2 checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent"
            {...rest}
          />
          <Check aria-hidden size={12} strokeWidth={3} className="pointer-events-none relative text-accent-contrast opacity-0 peer-checked:opacity-100" />
        </span>
        {label ? <span>{label}</span> : null}
      </label>
      {hint && !error ? (
        <p id={aria.hintId} className="pl-6 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={aria.errorId} role="alert" className="pl-6 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------- Switch ---------------- */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Texto accesible si no hay `label` visible. */
  "aria-label"?: string;
}

export function Switch({ checked, onChange, label, hint, disabled, id, className, "aria-label": ariaLabel }: SwitchProps) {
  const aria = useFieldAria(id, { hint });
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        role="switch"
        id={aria.id}
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? `${aria.id}-label` : undefined}
        aria-describedby={aria["aria-describedby"]}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-accent" : "bg-surface-3 border-border-strong",
        )}
      >
        <span aria-hidden className={cn("size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-[2px]")} />
      </button>
      {label || hint ? (
        <div className="flex flex-col">
          {label ? (
            <span id={`${aria.id}-label`} className="text-sm">
              {label}
            </span>
          ) : null}
          {hint ? (
            <span id={aria.hintId} className="text-xs text-muted">
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
