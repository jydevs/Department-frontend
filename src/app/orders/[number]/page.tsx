"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import type { ApiPublicOrder } from "@/lib/api/types";

function Order() {
  const { number } = useParams<{ number: string }>();
  const token = useSearchParams().get("token");
  const [order, setOrder] = useState<ApiPublicOrder | null>(null);
  const [fetched, setState] = useState<"loading" | "ready" | "error">("loading");
  const invalid = !token || !/^\d+$/.test(number);
  const state = invalid ? "error" : fetched;

  useEffect(() => {
    if (invalid) return;
    let off = false;
    apiFetch<ApiPublicOrder>(`/storefront/orders/${number}`, { query: { token: token! } })
      .then((o) => { if (!off) { setOrder(o); setState("ready"); } })
      .catch(() => { if (!off) setState("error"); });
    return () => { off = true; };
  }, [number, token, invalid]);

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Tu pedido</p>
        <h1 className="font-display text-display-xl mb-10">Pedido #{number}</h1>
        {state === "loading" && <p role="status">Cargando…</p>}
        {state === "error" && (
          <div role="alert"><p className="max-w-xl text-white/70">No pudimos mostrar este pedido. Revisa que el enlace esté completo o entra a tu cuenta.</p><Button href="/account/orders" variant="red" size="lg" className="mt-8">Mis pedidos</Button></div>
        )}
        {order && <OrderView order={order} />}
      </div>
    </div>
  );
}

export default function PublicOrderPage() {
  return <Suspense fallback={null}><Order /></Suspense>;
}
