"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { isAbortError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";
import { getCartAuth, resetCart } from "@/lib/cart";
import { goToPayment, minutesLeft, paymentDestination, useHydrated, useLastOrder } from "@/lib/checkout";

const POLL_MS = 2500;
/** El webhook de la pasarela puede tardar unos segundos: se consulta hasta este tiempo. */
const POLL_WINDOW_MS = 90_000;
const BACKOFF_MS = [2500, 5000, 10_000, 15_000];

type Phase = "loading" | "ready" | "timeout" | "error";

/**
 * Resultado del pago (`redirectUrl` de Wompi y de la pasarela simulada). El estado real lo confirma el webhook en el
 * backend, por eso se consulta el pedido (por token) hasta que deje de estar pendiente. Un fallo de red durante el sondeo
 * se reintenta con espera creciente sin detenerlo.
 */
export default function CheckoutResultPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const last = useLastOrder();
  const [order, setOrder] = useState<ApiPublicOrder | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [round, setRound] = useState(0);
  const orderNumber = last?.orderNumber;
  const accessToken = last?.accessToken;
  const cartId = last?.cartId;

  useEffect(() => {
    if (orderNumber === undefined || !accessToken) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + POLL_WINDOW_MS;
    let failures = 0;
    const tick = async () => {
      try {
        const o = await apiFetch<ApiPublicOrder>(`/storefront/orders/${orderNumber}`, { query: { token: accessToken }, signal: ctrl.signal });
        failures = 0;
        setOrder(o);
        if (o.paymentStatus === "paid") {
          setPhase("ready");
          if (cartId && getCartAuth()?.id === cartId) resetCart(); // ya es un pedido pagado: el carrito local se vacía SOLO ahora
          return;
        }
        const declined = o.payment?.status === "declined" || o.payment?.status === "error";
        const closed = o.status === "cancelled" || o.status === "expired" || o.paymentStatus === "failed" || o.paymentStatus === "voided";
        if (declined || closed) {
          setPhase("ready");
          return;
        }
        if (Date.now() >= deadline) {
          setPhase("timeout");
          return;
        }
        setPhase("ready");
        timer = setTimeout(() => void tick(), POLL_MS);
      } catch (e) {
        if (isAbortError(e)) return;
        failures++;
        if (Date.now() >= deadline) {
          setPhase((p) => (p === "ready" ? "timeout" : "error"));
          return;
        }
        timer = setTimeout(() => void tick(), BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]);
      }
    };
    void tick();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [orderNumber, accessToken, cartId, round]);

  const retryPolling = () => {
    setPhase("loading");
    setRound((r) => r + 1);
  };

  const paid = order?.paymentStatus === "paid";
  const declined = !paid && (order?.payment?.status === "declined" || order?.payment?.status === "error") && order?.status !== "cancelled" && order?.status !== "expired";
  const closed = !!order && !paid && !declined && (order.status === "cancelled" || order.status === "expired" || order.paymentStatus === "failed" || order.paymentStatus === "voided");
  const pending = !!order && !paid && !declined && !closed;
  const mins = minutesLeft(order?.reservedUntil);
  const canRetryPayment = !!last && declined && (mins === null || mins > 0);
  const missing = hydrated && !last;
  const orderLink = last ? `/orders/${last.orderNumber}?token=${encodeURIComponent(last.accessToken)}` : "/account/orders";

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Resultado del pago</p>
        {!missing && !order && phase === "loading" && <p role="status" className="font-display text-display-lg">Consultando tu pedido…</p>}
        {missing && (
          <>
            <h1 className="font-display text-display-xl">No encontramos tu pedido</h1>
            <p className="mt-6 max-w-xl text-white/70">Abre el enlace del correo de confirmación o revisa tus pedidos en tu cuenta.</p>
            <Button href="/account/orders" variant="red" size="lg" className="mt-8">Mis pedidos</Button>
          </>
        )}
        {!missing && !order && phase === "error" && (
          <div role="alert">
            <h1 className="font-display text-display-xl">No pudimos consultar el pedido</h1>
            <p className="mt-6 max-w-xl text-white/70">Revisa tu conexión. Si ya pagaste, no vuelvas a pagar: tu pedido sigue registrado y recibirás la confirmación por correo.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="red" size="lg" onClick={retryPolling} data-testid="result-retry">Reintentar</Button>
              <Link href={orderLink} className="font-condensed inline-flex h-14 items-center border border-white/30 px-9 text-sm tracking-[0.12em] hover:bg-white hover:text-black">Ver mi pedido</Link>
            </div>
          </div>
        )}
        {order && (
          <>
            <h1 data-testid="result-title" className="font-display text-display-xl mb-10">
              {paid ? "¡Pago recibido!" : declined ? "Pago rechazado" : closed ? "El pago no se completó" : phase === "timeout" ? "No pudimos confirmar tu pago todavía" : "Confirmando tu pago…"}
            </h1>
            {pending && phase !== "timeout" && <p role="status" className="mb-10 max-w-xl text-white/70">Estamos esperando la confirmación de la pasarela. Esta página se actualiza sola; no cierres la ventana.</p>}
            {pending && phase === "timeout" && (
              <div role="alert" data-testid="result-timeout" className="mb-10 max-w-xl">
                <p className="text-white/70">La pasarela aún no nos confirma el pago. Si ya pagaste, recibirás un correo cuando se acredite; no vuelvas a pagar. Puedes actualizar el estado o ver tu pedido.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="red" size="md" onClick={retryPolling} data-testid="result-refresh">Actualizar</Button>
                  <Link href={orderLink} className="font-condensed inline-flex h-11 items-center border border-white/30 px-6 text-xs tracking-[0.12em] hover:bg-white hover:text-black">Ver mi pedido</Link>
                </div>
              </div>
            )}
            {paid && <p className="mb-10 max-w-xl text-white/70">Te enviamos la confirmación a {order.email}. Guarda el número de pedido #{order.orderNumber}.</p>}
            {declined && (
              <div role="alert" data-testid="result-declined" className="mb-10 max-w-xl">
                <p className="text-white/70">La pasarela rechazó el pago y no se hizo ningún cobro. {canRetryPayment ? `Puedes intentarlo de nuevo${mins !== null ? `: tus productos siguen reservados ${mins <= 1 ? "un minuto más" : `${mins} minutos más`}` : ""}.` : "La reserva de tus productos venció; vuelve a la tienda para empezar de nuevo."}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {canRetryPayment && last && <Button variant="red" size="md" onClick={() => goToPayment(paymentDestination(last.payment), router.push)} data-testid="result-retry-payment">Reintentar pago</Button>}
                  <Link href="/checkout" className="font-condensed inline-flex h-11 items-center border border-white/30 px-6 text-xs tracking-[0.12em] hover:bg-white hover:text-black">Volver al checkout</Link>
                </div>
              </div>
            )}
            {closed && <p className="mb-10 max-w-xl text-white/70">No se hizo ningún cobro y el pedido se canceló. Puedes volver a la tienda y empezar de nuevo.</p>}
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
