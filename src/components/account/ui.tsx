"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";
import { assessPassword } from "@/lib/account/password";

/* ── layout ─────────────────────────────────────────────── */

/** Centered card used by every auth screen (login, register, verify, reset…). */
export function AuthShell({
  eyebrow,
  title,
  children,
  testId,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  testId?: string;
  wide?: boolean;
}) {
  return (
    <div data-testid={testId} className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className={clsx("mx-auto w-full border border-white/15 bg-dept-black p-6 sm:p-10", wide ? "max-w-xl" : "max-w-md")}>
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">{eyebrow}</p>
        <h1 className="font-display text-display-md mb-6 text-dept-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/* ── messages ───────────────────────────────────────────── */

type NoticeKind = "error" | "success" | "info";

const NOTICE_STYLE: Record<NoticeKind, string> = {
  error: "border-dept-red-light/50 bg-dept-red-dark/20 text-dept-red-light",
  success: "border-white/30 bg-white/5 text-dept-white",
  info: "border-white/15 bg-white/[0.03] text-dept-gray-300",
};

/** Always mounted by the caller so screen readers announce the text when it appears (`aria-live`). */
export function Notice({ kind, children, testId, id }: { kind: NoticeKind; children?: ReactNode; testId?: string; id?: string }) {
  return (
    <div id={id} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"} aria-atomic="true">
      {children ? (
        <p data-testid={testId} className={clsx("font-condensed border px-4 py-3 text-xs leading-relaxed tracking-[0.08em]", NOTICE_STYLE[kind])}>
          {children}
        </p>
      ) : null}
    </div>
  );
}

/* ── fields ─────────────────────────────────────────────── */

export const inputClass =
  "w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-base text-dept-white placeholder:text-dept-gray-500 " +
  "transition-colors focus:border-dept-white aria-[invalid=true]:border-dept-red-light disabled:opacity-50";

const labelClass = "font-condensed mb-2 block text-xs tracking-[0.12em] text-dept-gray-300";
const errorClass = "font-condensed mt-2 text-xs tracking-[0.06em] text-dept-red-light";
const hintClass = "font-condensed mt-2 text-[11px] tracking-[0.06em] text-dept-gray-500";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string | null;
  hint?: string;
  /** shown next to the label (e.g. a "forgot password" link) */
  aside?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, aside, className, ...rest }, ref) {
  const uid = useId();
  const describedBy = [error ? `${uid}-err` : null, hint ? `${uid}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={uid} className={labelClass}>
          {label}
          {rest.required && <span aria-hidden className="text-dept-gray-500"> *</span>}
        </label>
        {aside}
      </div>
      <input ref={ref} id={uid} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={clsx(inputClass, className)} {...rest} />
      {hint && !error && (
        <p id={`${uid}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${uid}-err`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
});

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  error?: string | null;
  placeholder?: string;
  options: readonly string[];
}

export function SelectField({ label, error, placeholder, options, className, ...rest }: SelectFieldProps) {
  const uid = useId();
  return (
    <div>
      <label htmlFor={uid} className={labelClass}>
        {label}
        {rest.required && <span aria-hidden className="text-dept-gray-500"> *</span>}
      </label>
      <select id={uid} aria-invalid={error ? true : undefined} aria-describedby={error ? `${uid}-err` : undefined} className={clsx(inputClass, "appearance-none bg-[length:12px] pr-10", className)} {...rest}>
        {placeholder !== undefined && (
          <option value="" className="bg-dept-black">
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o} className="bg-dept-black">
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${uid}-err`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  label,
  error,
  children,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & { label?: string; error?: string | null; children?: ReactNode }) {
  const uid = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={uid}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${uid}-err` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none border border-white/40 bg-white/5 transition-colors checked:border-dept-red checked:bg-dept-red aria-[invalid=true]:border-dept-red-light"
          style={{ backgroundImage: rest.checked ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='white' stroke-width='2.4'%3E%3Cpath d='M4.5 10.5l3.5 3.5 7.5-8'/%3E%3C/svg%3E\")" : undefined }}
          {...rest}
        />
        <label htmlFor={uid} className="font-condensed cursor-pointer text-xs leading-relaxed tracking-[0.06em] text-dept-gray-300">
          {children ?? label}
        </label>
      </div>
      {error && (
        <p id={`${uid}-err`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── password ───────────────────────────────────────────── */

const METER_COLORS = ["bg-dept-red", "bg-dept-red", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

export function PasswordMeter({ password, context }: { password: string; context?: string[] }) {
  const strength = assessPassword(password, context);
  if (!password) return null;
  return (
    <div className="mt-3" data-testid="password-meter">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={clsx("h-1 flex-1 transition-colors", strength.score >= i ? METER_COLORS[strength.score] : "bg-white/15")} />
        ))}
      </div>
      <p className="font-condensed mt-2 text-[11px] tracking-[0.1em] text-dept-gray-300" aria-live="polite">
        Seguridad: <span data-testid="password-strength-label" className="text-dept-white">{strength.label}</span>
      </p>
      {strength.tips.length > 0 && (
        <ul className="font-condensed mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed tracking-[0.04em] text-dept-gray-500">
          {strength.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface PasswordFieldProps extends Omit<FieldProps, "type"> {
  meter?: boolean;
  meterContext?: string[];
}

/** Password input with a show/hide toggle and, optionally, the strength meter. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { meter = false, meterContext, aside, value, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-pressed={visible}
      className="font-condensed mb-2 text-[11px] tracking-[0.1em] text-dept-gray-500 underline-offset-4 hover:text-dept-white hover:underline"
    >
      {visible ? "Ocultar" : "Mostrar"}
    </button>
  );
  return (
    <div>
      <Field
        ref={ref}
        {...rest}
        value={value}
        type={visible ? "text" : "password"}
        aside={
          <span className="flex items-center gap-4">
            {aside}
            {toggle}
          </span>
        }
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      {meter && <PasswordMeter password={typeof value === "string" ? value : ""} context={meterContext} />}
    </div>
  );
});

/* ── misc ───────────────────────────────────────────────── */

/** Moves focus to the first invalid control of a form (accessible error handling). */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  window.requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-10">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-dept-white" />
      <span className="font-condensed text-xs tracking-[0.14em] text-dept-gray-300">{label}</span>
    </div>
  );
}

export const secondaryBtn =
  "font-condensed inline-flex h-11 items-center justify-center border border-white/25 px-6 text-xs tracking-[0.16em] text-dept-white transition-colors hover:border-dept-white hover:bg-dept-white hover:text-dept-black disabled:cursor-not-allowed disabled:opacity-40";

export const linkClass = "text-dept-white underline underline-offset-4 hover:text-dept-red-light";
