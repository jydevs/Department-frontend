"use client";

import { useEffect, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { useAccount } from "@/lib/account";

export const inputClass =
  "w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white aria-[invalid=true]:border-dept-red";
export const ghostClass =
  "font-condensed border border-white/20 px-5 py-2.5 text-xs tracking-[0.16em] text-dept-white transition-colors hover:border-dept-white hover:bg-dept-white hover:text-dept-black disabled:opacity-40";

/** Tarjeta centrada de los formularios de autenticación (mismo estilo que login/registro). */
export function AuthCard({ eyebrow, title, children, testId, center }: { eyebrow: string; title: string; children: ReactNode; testId?: string; center?: boolean }) {
  return (
    <div data-testid={testId} className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className={clsx("mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10", center && "text-center")}>
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">{eyebrow}</p>
        <h1 className="font-display text-display-md text-dept-white mb-6">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} className={inputClass} {...rest} />
      {error ? <p id={`${id}-e`} role="alert" className="font-condensed mt-1.5 text-[11px] tracking-[0.1em] text-dept-red-light">{error}</p>
        : hint ? <p id={`${id}-h`} className="font-condensed mt-1.5 text-[11px] tracking-[0.1em] text-dept-gray-500">{hint}</p> : null}
    </div>
  );
}

export function FormError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" data-testid={id} className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{children}</p>;
}

/** Exige sesión: sin ella manda a /account/login. Devuelve el estado para pintar `loading` y el cliente. */
export function useRequireSession() {
  const router = useRouter();
  const acc = useAccount();
  useEffect(() => {
    if (acc.status === "anonymous") router.replace("/account/login");
  }, [acc.status, router]);
  return acc;
}

export function Loading() {
  return <p role="status" className="font-condensed text-xs tracking-[0.12em] text-dept-gray-400">Cargando…</p>;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_HINT = "Mínimo 12 caracteres.";
