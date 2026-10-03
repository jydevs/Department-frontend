"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import type { ApiPublicOrder } from "@/lib/api/types";
import { readLastOrder } from "@/lib/checkout";
import { resetCart } from "@/lib/cart";

const POLL_MS = 2500;
const MAX_POLLS = 30; // ~75 s: el webhook de la pasarela puede tardar unos segundos

/**
 * Resultado del pago (`redirectUrl` de Wompi y de la pasarela simulada). El estado real lo confirma el
 * webhook en el backend, por eso se consulta el pedido (por token) hasta que deje de estar pendiente.
 */
export default function CheckoutResultPage() {
  const [order, setOrder] = useState<ApiPublicOrder | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "error" | "ready">("loading");
  const polls = useRef(0);

  useEffect(() => {
    const last = readLastOrder();
    if (!last) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("missing");
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const o = await apiFetch<ApiPublicOrder>(`/storefront/orders/${last.orderNumber}`, { query: { token: last.accessToken } });
        if (stop) return;
        setOrder(o);
        setState("ready");
        if (o.paymentStatus === "paid") resetCart();
        if (o.paymentStatus === "pending" && o.status !== "cancelled" && ++polls.current < MAX_POLLS) timer = setTimeout(tick, POLL_MS);
      } catch {
        if (!stop) setState((s) => (s === "ready" ? s : "error"));
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  const paid = order?.paymentStatus === "paid";
  const failed = order && (order.paymentStatus === "failed" || order.paymentStatus === "voided" || order.status === "cancelled");
  const pending = order && !paid && !failed;

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Resultado del pago</p>
        {state === "loading" && <p role="status" className="font-display text-display-lg">Consultando tu pedido…</p>}
        {state === "missing" && (
          <>
            <h1 className="font-display text-display-xl">No encontramos tu pedido</h1>
            <p className="mt-6 max-w-xl text-white/70">Abre el enlace del correo de confirmación o revisa tus pedidos en tu cuenta.</p>
            <Button href="/account/orders" variant="red" size="lg" className="mt-8">Mis pedidos</Button>
          </>
        )}
        {state === "error" && <p role="alert" className="font-display text-display-lg">No pudimos consultar el pedido. <button type="button" onClick={() => window.location.reload()} className="link-underline">Reintentar</button></p>}
        {order && (
          <>
            <h1 data-testid="result-title" className="font-display text-display-xl mb-10">
              {paid ? "¡Pago recibido!" : failed ? "El pago no se completó" : "Confirmando tu pago…"}
            </h1>
            {pending && <p role="status" className="mb-10 max-w-xl text-white/70">Estamos esperando la confirmación de la pasarela. Esta página se actualiza sola; no cierres la ventana.</p>}
            {paid && <p className="mb-10 max-w-xl text-white/70">Te enviamos la confirmación a {order.email}. Guarda el número de pedido #{order.orderNumber}.</p>}
            {failed && <p className="mb-10 max-w-xl text-white/70">No se hizo ningún cobro. Puedes intentarlo de nuevo desde la tienda.</p>}
            <OrderView order={order} />
            <div className="mt-12 flex flex-wrap gap-3">
              <Button href="/collections/all" variant={paid ? "solid" : "red"} size="lg" arrow>{paid ? "Seguir comprando" : "Volver a la tienda"}</Button>
              <Link href="/account/orders" className="font-condensed inline-flex h-14 items-center border border-white/30 px-9 text-sm tracking-[0.12em] hover:bg-white hover:text-black">Mis pedidos</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
