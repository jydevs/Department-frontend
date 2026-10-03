"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AuthCard, AuthSkeleton, useUrlToken } from "./ui";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

interface Props { testId: string; eyebrow: string; path: string; method: "GET" | "POST"; doneTitle: string; doneText: string }

type Result = "ok" | "fail" | "limit" | "retry";

function Run(p: Props) {
  const token = useUrlToken();
  const valid = /^[A-Za-z0-9_.-]{43,90}$/.test(token);
  const [res, setRes] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  // StrictMode ejecuta los efectos dos veces en desarrollo: un solo disparo por intento (el token es de un solo uso)
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!valid || firedFor.current === attempt) return;
    firedFor.current = attempt;
    apiFetch(p.path, { method: p.method, query: { token } })
      .then(() => setRes("ok"))
      .catch((e: unknown) => {
        // un éxito ya registrado no se pisa con un fallo posterior (p. ej. INVALID_TOKEN por reintento del mismo enlace)
        setRes((prev) => {
          if (prev === "ok") return "ok";
          if (e instanceof ApiError && e.status === 429) return "limit";
          if (e instanceof ApiError && !e.isTransient) return "fail";
          return "retry";
        });
      });
  }, [valid, token, p.path, p.method, attempt]);

  const state: Result | null = !valid ? "fail" : res;
  const title = state === "ok" ? p.doneTitle : state === "fail" ? "Enlace no válido" : state === "limit" ? "Demasiados intentos" : state === "retry" ? "No pudimos completar la acción" : "Procesando…";
  return (
    <AuthCard eyebrow={p.eyebrow} title={title} testId={p.testId} center>
      {state === null ? <p role="status" className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Un momento…</p> : (
        <>
          <p role={state === "ok" ? "status" : "alert"} data-testid={`${p.testId}-${state}`} className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300 mb-8">
            {state === "ok" ? p.doneText : state === "limit" ? "Espera un minuto y vuelve a intentarlo." : state === "retry" ? "Hubo un problema de conexión o del servidor. Inténtalo de nuevo." : "El enlace no es válido o ya venció."}
          </p>
          {state === "retry" || state === "limit" ? (
            <Button variant="red" size="lg" className="w-full" onClick={() => { setRes(null); setAttempt((n) => n + 1); }} data-testid={`${p.testId}-retry`}>Reintentar</Button>
          ) : (
            <Button href="/" variant="solid" size="lg" className="w-full">Volver a la tienda</Button>
          )}
        </>
      )}
    </AuthCard>
  );
}

export function NewsletterToken(p: Props) {
  return <Suspense fallback={<AuthSkeleton rows={0} />}><Run {...p} /></Suspense>;
}
