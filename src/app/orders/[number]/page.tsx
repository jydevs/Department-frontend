"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useUrlToken } from "@/components/account/ui";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { ApiError, friendlyError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";

type Fetched = { key: string; order?: ApiPublicOrder; error?: { transient: boolean; message: string } };

function Order() {
  const { number } = useParams<{ number: string }>();
  // el token del enlace del correo se quita de la URL (queda solo en esta pestaña para poder recargar)
  const token = useUrlToken(`dept-order-token-${number}`);
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const invalid = !token || !/^\d+$/.test(number);
  const key = `${number}|${token}|${attempt}`;

  useEffect(() => {
    if (invalid) return;
    const ctrl = new AbortController();
    apiFetch<ApiPublicOrder>(`/storefront/orders/${number}`, { query: { token }, signal: ctrl.signal })
      .then((order) => setFetched({ key, order }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setFetched({ key, error: { transient: !(e instanceof ApiError) || e.isTransient, message: friendlyError(e, "No pudimos mostrar este pedido.") } });
      });
    return () => ctrl.abort();
  }, [number, token, invalid, key]);

  const cur = fetched?.key === key ? fetched : null;
  const state = invalid ? "invalid" : !cur ? "loading" : cur.error ? (cur.error.transient ? "retry" : "invalid") : "ready";

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Tu pedido</p>
        <h1 className="font-display text-display-xl mb-10">Pedido #{number}</h1>
        {state === "loading" && <p role="status">Cargando…</p>}
        {state === "invalid" && (
          <div role="alert"><p className="max-w-xl text-white/70">No pudimos mostrar este pedido. Revisa que el enlace esté completo o entra a tu cuenta.</p><Button href="/account/orders" variant="red" size="lg" className="mt-8">Mis pedidos</Button></div>
        )}
        {state === "retry" && (
          <div role="alert"><p className="max-w-xl text-white/70">{cur?.error?.message} Revisa tu conexión e inténtalo de nuevo.</p><Button variant="red" size="lg" className="mt-8" onClick={() => setAttempt((n) => n + 1)} data-testid="order-retry">Reintentar</Button></div>
        )}
        {cur?.order && <OrderView order={cur.order} />}
      </div>
    </div>
  );
}

export default function PublicOrderPage() {
  return <Suspense fallback={<p role="status" className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)]">Cargando…</p>}><Order /></Suspense>;
}
