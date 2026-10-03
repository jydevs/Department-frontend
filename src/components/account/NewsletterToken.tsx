"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AuthCard } from "./ui";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

interface Props { testId: string; eyebrow: string; path: string; method: "GET" | "POST"; doneTitle: string; doneText: string }

function Run(p: Props) {
  const token = useSearchParams().get("token") ?? "";
  const valid = /^[A-Za-z0-9_.-]{43,90}$/.test(token);
  const [res, setRes] = useState<"ok" | "fail" | "limit" | null>(null);

  useEffect(() => {
    if (!valid) return;
    let off = false;
    apiFetch(p.path, { method: p.method, query: { token } })
      .then(() => { if (!off) setRes("ok"); })
      .catch((e) => { if (!off) setRes(e instanceof ApiError && e.status === 429 ? "limit" : "fail"); });
    return () => { off = true; };
  }, [valid, token, p.path, p.method]);

  const state = !valid ? "fail" : res;
  return (
    <AuthCard eyebrow={p.eyebrow} title={state === "ok" ? p.doneTitle : state === "fail" ? "Enlace no válido" : state === "limit" ? "Demasiados intentos" : "Procesando…"} testId={p.testId} center>
      {state === null ? <p role="status" className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Un momento…</p> : (
        <>
          <p role={state === "ok" ? "status" : "alert"} data-testid={`${p.testId}-${state}`} className="font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-gray-300 mb-8">
            {state === "ok" ? p.doneText : state === "limit" ? "Espera un minuto y recarga la página." : "El enlace no es válido o ya venció."}
          </p>
          <Button href="/" variant="solid" size="lg" className="w-full">Volver a la tienda</Button>
        </>
      )}
    </AuthCard>
  );
}

export function NewsletterToken(p: Props) {
  return <Suspense fallback={null}><Run {...p} /></Suspense>;
}
