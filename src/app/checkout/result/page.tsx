"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { CancelOrder } from "@/components/checkout/CancelOrder";
import { OrderView } from "@/components/checkout/OrderView";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { isAbortError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";
import { getCartAuth, resetCart, restoreCartAfterCancel } from "@/lib/cart";
import { clearLastOrder, goToPayment, minutesLeft, paymentDestination, useHydrated, useLastOrder, type CancelResult, type LastOrder } from "@/lib/checkout";

const POLL_MS = 2500;
/** El webhook de la pasarela puede tardar unos segundos: se consulta hasta este tiempo. */
const POLL_WINDOW_MS = 90_000;
const BACKOFF_MS = [2500, 5000, 10_000, 15_000];

type Phase = "loading" | "ready" | "timeout" | "error";

const RESULT_KEY = "dept-result-order";

/**
 * Número de pedido del retorno de la pasarela (`?order=N`; Wompi añade `?id=` y `env`). Se lee UNA vez, se quita de la barra de
 * direcciones y se recuerda en `sessionStorage` (solo esta pestaña) para que recargar no lo pierda. `null` si no viene.
 */
function useReturnedOrder(): number | null {
  const params = useSearchParams();
  const [n] = useState<number | null>(() => {
    const raw = params.get("order");
    const fromUrl = raw && /^\d{1,12}$/.test(raw) ? Number(raw) : null;
    try {
      if (fromUrl !== null) window.sessionStorage.setItem(RESULT_KEY, String(fromUrl));
      if (fromUrl !== null) return fromUrl;
      const saved = window.sessionStorage.getItem(RESULT_KEY);
      return saved && /^\d{1,12}$/.test(saved) ? Number(saved) : null;
    } catch {
      return fromUrl;
    }
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!["order", "id", "env"].some((k) => url.searchParams.has(k))) return;
    for (const k of ["order", "id", "env"]) url.searchParams.delete(k);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return n;
}

/** Token guardado para ese pedido: el del último checkout SOLO si es el mismo número; si no, el de un enlace de correo abierto en esta pestaña. */
function tokenFor(n: number, last: LastOrder | null): string | null {
  if (last?.orderNumber === n) return last.accessToken;
  try {
    return window.sessionStorage.getItem(`dept-order-token-${n}`);
  } catch {
    return null;
  }
}

/**
 * Resultado del pago (`redirectUrl` de Wompi y de la pasarela simulada: `/checkout/result?order=N`). El estado real lo confirma el
 * webhook en el backend, por eso se consulta el pedido (por token) hasta que deje de estar pendiente. Un fallo de red durante el
 * sondeo se reintenta con espera creciente sin detenerlo. Sin `?order=` se usa el último pedido guardado; con `?order=N` solo se
 * consulta si el token guardado corresponde a ESE pedido; si no (otro navegador o dispositivo) no se muestra ningún dato.
 */
function Result() {
  const router = useRouter();
  const hydrated = useHydrated();
  const live = useLastOrder();
  const returned = useReturnedOrder();
  // se conserva el último pedido leído aunque se limpie el guardado (p. ej. al cancelarlo) para no perder la pantalla
  const [last, setKept] = useState<LastOrder | null>(null);
  if (live && live !== last) setKept(live);
  const [order, setOrder] = useState<ApiPublicOrder | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [round, setRound] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const orderNumber = returned ?? last?.orderNumber;
  const accessToken = hydrated && orderNumber !== undefined ? (tokenFor(orderNumber, last) ?? undefined) : undefined;
  const cartId = last && last.orderNumber === orderNumber ? last.cartId : undefined;

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
        if (o.paymentStatus === "paid" && o.status === "cancelled") {
          setPhase("ready"); // pago tardío de un pedido ya cancelado: no revive, queda en reembolso (no se toca el carrito)
          return;
        }
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

  /** El pedido se canceló y después llegó una aprobación de la pasarela: no revive, el personal lo reembolsa. */
  const lateApproval = order?.paymentStatus === "paid" && order.status === "cancelled";
  const paid = order?.paymentStatus === "paid" && !lateApproval;
  const declined = !paid && (order?.payment?.status === "declined" || order?.payment?.status === "error") && order?.status !== "cancelled" && order?.status !== "expired";
  const closed = !!order && !paid && !lateApproval && !declined && (order.status === "cancelled" || order.status === "expired" || order.paymentStatus === "failed" || order.paymentStatus === "voided");
  const pending = !!order && !paid && !lateApproval && !declined && !closed;
  const mins = minutesLeft(order?.reservedUntil);
  const canRetryPayment = !!last && last.orderNumber === orderNumber && declined && (mins === null || mins > 0);
  /** Volvió de la pasarela con `?order=N` pero este navegador no tiene el token de ese pedido: no se muestra nada del pedido. */
  const noToken = hydrated && returned !== null && !accessToken && !order;
  const missing = hydrated && returned === null && !last;
  const orderLink = orderNumber !== undefined && accessToken ? `/orders/${orderNumber}?token=${encodeURIComponent(accessToken)}` : "/account/orders";
  const onCancelled = async (r: CancelResult) => {
    if (r.kind === "cancelled") setOrder(r.order);
    else if (r.kind === "paid") { if (r.order) setOrder(r.order); retryPolling(); return; }
    setCancelled(true);
    if (live && live.orderNumber === orderNumber) {
      clearLastOrder();
      await restoreCartAfterCancel(live.cartId); // el carrito local sigue intacto hasta pagar: se recrea con las mismas líneas
    }
  };

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Resultado del pago</p>
        {!noToken && !missing && !order && phase === "loading" && <p role="status" className="font-display text-display-lg">Consultando tu pedido…</p>}
        {missing && (
          <>
            <h1 className="font-display text-display-xl">No encontramos tu pedido</h1>
            <p className="mt-6 max-w-xl text-white/70">Abre el enlace del correo de confirmación o revisa tus pedidos en tu cuenta.</p>
            <Button href="/account/orders" variant="red" size="lg" className="mt-8">Mis pedidos</Button>
          </>
        )}
        {noToken && (
          <div data-testid="result-no-token">
            <h1 className="font-display text-display-xl">Recibimos tu pedido #{returned}</h1>
            <p role="status" className="mt-6 max-w-xl text-white/70">Para ver su estado abre el enlace del correo de confirmación. Si ya pagaste, no vuelvas a pagar: la confirmación llegará a tu correo en unos minutos.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/account/login" variant="red" size="lg">Iniciar sesión</Button>
              <Link href="/account/orders" className="font-condensed inline-flex h-14 items-center border border-white/30 px-9 text-sm tracking-[0.12em] hover:bg-white hover:text-black">Mis pedidos</Link>
            </div>
          </div>
        )}
        {!noToken && !missing && !order && phase === "error" && (
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
              {lateApproval ? "Pedido cancelado: pago por reembolsar" : paid ? "¡Pago recibido!" : declined ? "Pago rechazado" : closed ? "El pago no se completó" : phase === "timeout" ? "No pudimos confirmar tu pago todavía" : "Confirmando tu pago…"}
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
            {lateApproval && (
              <p role="alert" data-testid="result-late-approval" className="mb-10 max-w-xl text-white/70">
                Cancelaste este pedido, pero la pasarela confirmó un pago después. El pedido no se enviará y te devolveremos el dinero; si no lo recibes, <Link href="/pages/contact" className="underline underline-offset-4">escríbenos</Link> con el número #{order?.orderNumber}.
              </p>
            )}
            {paid && <p className="mb-10 max-w-xl text-white/70">Te enviamos la confirmación a {order.email}. Guarda el número de pedido #{order.orderNumber}.</p>}
            {declined && (
              <div role="alert" data-testid="result-declined" className="mb-10 max-w-xl">
                <p className="text-white/70">La pasarela rechazó el pago y no se hizo ningún cobro. {canRetryPayment ? `Puedes intentarlo de nuevo${mins !== null ? `: tus productos siguen reservados ${mins <= 1 ? "un minuto más" : `${mins} minutos más`}` : ""}.` : "La reserva de tus productos venció; vuelve a la tienda para empezar de nuevo."}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {canRetryPayment && last && <Button variant="red" size="md" onClick={() => goToPayment(paymentDestination(last.payment), router.push)} data-testid="result-retry-payment">Reintentar pago</Button>}
                  <Link href="/checkout" className="font-condensed inline-flex h-11 items-center border border-white/30 px-6 text-xs tracking-[0.12em] hover:bg-white hover:text-black">Volver al checkout</Link>
                </div>
                {accessToken && orderNumber !== undefined && (
                  <div className="mt-3">
                    <CancelOrder orderNumber={orderNumber} token={accessToken} label="Cancelar pedido y volver a la tienda" gatewayMayBeOpen={order.payment?.provider === "wompi"} onResult={onCancelled} testId="result-cancel" />
                  </div>
                )}
              </div>
            )}
            {closed && <p data-testid="result-closed" className="mb-10 max-w-xl text-white/70">{cancelled ? "Cancelaste el pedido: liberamos tus productos y no se hizo ningún cobro." : "No se hizo ningún cobro y el pedido se canceló."} Puedes volver a la tienda y empezar de nuevo.</p>}
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

export default function CheckoutResultPage() {
  return <Suspense fallback={<p role="status" className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)]">Consultando tu pedido…</p>}><Result /></Suspense>;
}
