"use client";

import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { retrySession, useAccount, type AccountState } from "@/lib/account";

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

/**
 * Esqueleto de los formularios de autenticación (`Suspense fallback` de `useSearchParams`): reserva la misma altura que la
 * tarjeta real para que el pie no salte cuando aparece el formulario (CLS).
 */
export function AuthSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex min-h-[70vh] flex-col justify-center px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto w-full max-w-md border border-white/15 bg-dept-black p-8 sm:p-10">
        <div className="mb-2 h-[1.0625rem]" />
        <div className="mb-6 h-9 w-2/3 animate-pulse bg-white/10" />
        <div className="space-y-5">
          {Array.from({ length: rows }, (_, i) => <div key={i} className="h-[4.75rem] animate-pulse bg-white/[0.04]" />)}
          <div className="mt-4 h-14 animate-pulse bg-white/10" />
        </div>
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

/**
 * Lee `?token=` UNA vez y lo quita de la barra de direcciones (`history.replaceState`) para que no quede en el historial,
 * en capturas ni en el encabezado `Referer`. Con `persistKey` se guarda en `sessionStorage` (solo esa pestaña) para que
 * recargar la página no pierda el enlace. Solo para componentes bajo `Suspense` (se renderizan en el cliente).
 */
export function useUrlToken(persistKey?: string): string {
  const params = useSearchParams();
  const [token] = useState(() => {
    const fromUrl = params.get("token");
    try {
      if (fromUrl && persistKey) window.sessionStorage.setItem(persistKey, fromUrl);
      return fromUrl ?? (persistKey ? window.sessionStorage.getItem(persistKey) : null) ?? "";
    } catch {
      return fromUrl ?? "";
    }
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return token;
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

/** Mientras la sesión no está resuelta: "Cargando…", o el aviso con "Reintentar" si no se pudo comprobar (red / servidor). */
export function SessionPending({ status }: { status: AccountState["status"] }) {
  if (status !== "unavailable") return <Loading />;
  return (
    <div role="alert" data-testid="session-unavailable" className="border border-white/15 p-6 font-condensed text-xs tracking-[0.1em] text-dept-gray-300">
      <p>No pudimos comprobar tu sesión (problema de conexión o del servidor). Tu sesión no se cerró.</p>
      <button type="button" onClick={retrySession} className="mt-4 border border-white/30 px-5 py-2.5 text-dept-white hover:bg-white hover:text-black">Reintentar</button>
    </div>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_HINT = "Mínimo 12 caracteres.";
