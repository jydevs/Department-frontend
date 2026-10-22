"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/admin/utils";

export interface FieldChrome {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
}

export interface FieldAria {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

/** ids y atributos aria coherentes para un control + su label/hint/error. */
export function useFieldAria(idProp: string | undefined, { hint, error, required }: FieldChrome): FieldAria & { hintId: string; errorId: string } {
  const auto = useId();
  const id = idProp ?? auto;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return { id, hintId, errorId, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, "aria-required": required ? true : undefined };
}

interface FieldProps extends FieldChrome {
  /** id del control (para el `htmlFor` del label). Usa `useFieldAria` si necesitas generarlo. */
  htmlFor?: string;
  hintId?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
}

/** Envoltorio label + control + hint + error. Los controles del kit lo usan por dentro. */
export function Field({ label, hint, error, required, htmlFor, hintId, errorId, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-text">
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const controlClasses =
  "w-full min-w-0 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-text placeholder:text-muted/80 transition-colors hover:border-muted focus:border-focus focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";
