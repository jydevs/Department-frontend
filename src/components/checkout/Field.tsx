"use client";

import { useId, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";

export const inputClass =
  "w-full border bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none placeholder:text-dept-gray-500 focus:border-dept-white disabled:opacity-50";

interface FieldProps {
  /** DOM id of the control: errors are matched to it and focus goes to it */
  id: string;
  label: string;
  required?: boolean;
  optionalHint?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean | undefined; "aria-required": boolean | undefined; "aria-describedby": string | undefined; className: string }) => ReactNode;
}

/** Label + control + error/hint, wired for assistive tech (`aria-invalid`, `aria-describedby`, error linked through `aria-describedby`; the summary announces errors). */
export function Field({ id, label, required, optionalHint, error, hint, className, children }: FieldProps) {
  const uid = useId();
  const errId = `${uid}-err`;
  const hintId = `${uid}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="font-condensed mb-2 block text-xs tracking-[0.12em] text-dept-gray-300">
        {label}
        {required ? <span aria-hidden> *</span> : null}
        {optionalHint ? <span className="text-dept-gray-500"> (opcional)</span> : null}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
        "aria-describedby": describedBy,
        className: clsx(inputClass, error ? "border-dept-red" : "border-white/20"),
      })}
      {hint && !error ? (
        <p id={hintId} className="font-condensed mt-1.5 text-[11px] tracking-[0.06em] text-dept-gray-500">
          {hint}
        </p>
      ) : null}
      <p id={errId} data-testid={`error-${id}`} className="font-condensed mt-1.5 min-h-0 text-xs tracking-[0.04em] text-dept-red-light">
        {error}
      </p>
    </div>
  );
}
