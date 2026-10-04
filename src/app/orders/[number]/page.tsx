"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useUrlToken } from "@/components/account/ui";
import { CancelOrder } from "@/components/checkout/CancelOrder";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { ApiError, friendlyError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";
import { restoreCartAfterCancel } from "@/lib/cart";
import { clearLastOrder, readLastOrder, type CancelResult } from "@/lib/checkout";

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
  const shown = cur?.order;
  /** Solo un pedido pendiente de pago (sin pago confirmado) se puede cancelar. */
  const cancellable = !!shown && shown.status === "pending" && shown.paymentStatus !== "paid";
  const onCancelled = async (r: CancelResult) => {
    if (r.kind === "cancelled") setFetched({ key, order: r.order });
    else if (r.kind === "paid" && r.order) setFetched({ key, order: r.order });
    else setAttempt((n) => n + 1); // ya cerrado: se vuelve a leer el estado real
    if (r.kind === "paid") return;
    // si este navegador es el que creó el pedido: se olvida y el carrito local (intacto hasta pagar) se recrea con las mismas líneas
    const last = readLastOrder();
    if (last && last.orderNumber === Number(number)) {
      clearLastOrder();
      await restoreCartAfterCancel(last.cartId);
    }
  };
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
        {shown && <OrderView order={shown} />}
        {cancellable && shown && (
          <div className="mt-10 max-w-xl" data-testid="order-cancel-box">
            <p className="mb-3 text-sm text-white/60">Este pedido sigue pendiente de pago. Si ya no lo quieres, puedes cancelarlo y liberar tus productos.</p>
            <CancelOrder orderNumber={shown.orderNumber} token={token} label="Cancelar pedido" gatewayMayBeOpen={shown.payment?.provider !== "mock"} onResult={onCancelled} testId="order-cancel" />
          </div>
        )}
        {shown?.status === "cancelled" && <p role="status" data-testid="order-cancelled" className="mt-8 max-w-xl text-sm text-white/60">Este pedido está cancelado. No se hizo ningún cobro.</p>}
      </div>
    </div>
  );
}

export default function PublicOrderPage() {
  return <Suspense fallback={<p role="status" className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)]">Cargando…</p>}><Order /></Suspense>;
}
