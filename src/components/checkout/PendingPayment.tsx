"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { friendlyError } from "@/lib/api/errors";
import type { ApiPublicOrder } from "@/lib/api/types";
import { CancelOrder } from "@/components/checkout/CancelOrder";
import { clearLastOrder, goToPayment, minutesLeft, paymentDestination, type CancelResult, type LastOrder } from "@/lib/checkout";
import { formatCOP } from "@/lib/format";

type View =
  | { kind: "loading" }
  | { kind: "pending"; order: ApiPublicOrder }
  | { kind: "gone"; reason: "expired" | "paid" }
  | { kind: "unknown"; message: string };

/**
 * Aviso "Tienes un pago pendiente": el pedido ya se creó (el carrito de la API quedó convertido) pero el pago no se
 * confirmó, p. ej. porque se volvió atrás desde la pasarela. Permite reanudar el pago con la MISMA referencia mientras la
 * reserva siga vigente, o descartar el intento y empezar de nuevo: descartar CANCELA el pedido en el servidor (libera el stock
 * reservado) tras confirmarlo; si el pedido resulta estar ya pagado se muestra como pagado y no se cancela nada.
 */
export function PendingPayment({ last, blocking, onRestart }: { last: LastOrder; blocking: boolean; onRestart: () => Promise<void> | void }) {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    const check = () => {
      apiFetch<ApiPublicOrder>(`/storefront/orders/${last.orderNumber}`, { query: { token: last.accessToken } })
        .then((order) => {
          if (off) return;
          setNow(Date.now());
          if (order.paymentStatus === "paid") setView({ kind: "gone", reason: "paid" });
          else if (order.status === "cancelled" || order.status === "expired" || order.paymentStatus === "failed" || order.paymentStatus === "voided") setView({ kind: "gone", reason: "expired" });
          else setView({ kind: "pending", order });
        })
        .catch((e: unknown) => {
          if (!off) setView((v) => (v.kind === "pending" ? v : { kind: "unknown", message: friendlyError(e, "No pudimos comprobar el estado de tu pago.") }));
        });
    };
    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      off = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(tick);
    };
  }, [last.orderNumber, last.accessToken]);

  /** Pedido ya cerrado (vencido/cancelado): no hay nada que cancelar en el servidor, solo limpiar y seguir. */
  const restart = async () => {
    setBusy(true);
    try {
      clearLastOrder();
      await onRestart();
    } finally {
      setBusy(false);
    }
  };
  const onCancelled = async (r: CancelResult) => {
    if (r.kind === "paid") {
      setView({ kind: "gone", reason: "paid" }); // el pago se confirmó mientras tanto: no se descarta nada
      return;
    }
    await restart(); // cancelado (o ya cerrado): se limpia el pedido guardado y se recrea el carrito
  };
  const discard = (
    <CancelOrder orderNumber={last.orderNumber} token={last.accessToken} variant="outline" label={blocking ? "Descartar y empezar de nuevo" : "Descartar"}
      question={`¿Descartar el pedido #${last.orderNumber}?`} gatewayMayBeOpen={last.payment.provider === "wompi"} disabled={busy} onResult={onCancelled} testId="pending-restart" />
  );

  if (view.kind === "loading") return <p role="status" data-testid="pending-payment-loading" className="mb-8 font-condensed text-xs tracking-[0.1em] text-dept-gray-500">Comprobando tu pago…</p>;

  if (view.kind === "gone") {
    if (view.reason === "paid") {
      return (
        <div data-testid="pending-payment" role="status" className="mb-8 border border-white/30 p-5">
          <p className="font-display text-display-md">Tu pago ya se confirmó</p>
          <p className="mt-2 text-sm text-white/70">El pedido #{last.orderNumber} está pagado.</p>
          <Button variant="red" size="md" className="mt-4" onClick={() => router.push("/checkout/result")}>Ver mi pedido</Button>
        </div>
      );
    }
    return (
      <div data-testid="pending-payment" role="alert" className="mb-8 border border-dept-red bg-dept-red/10 p-5">
        <p className="font-display text-display-md">La reserva de tu pedido venció</p>
        <p className="mt-2 text-sm text-white/70">El pedido #{last.orderNumber} ya no se puede pagar. {blocking ? "Puedes empezar de nuevo con los mismos productos." : "Puedes seguir con tu compra actual."}</p>
        <Button variant="red" size="md" className="mt-4" disabled={busy} onClick={() => void restart()} data-testid="pending-restart">{blocking ? "Empezar de nuevo" : "Entendido"}</Button>
      </div>
    );
  }

  if (view.kind === "unknown") {
    return (
      <div data-testid="pending-payment" role="alert" className="mb-8 border border-white/30 p-5">
        <p className="font-display text-display-md">Tienes un pago pendiente</p>
        <p className="mt-2 text-sm text-dept-red-light">{view.message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="red" size="md" onClick={() => goToPayment(paymentDestination(last.payment), router.push)} data-testid="pending-resume">Reanudar pago</Button>
          {discard}
        </div>
      </div>
    );
  }

  const { order } = view;
  const mins = minutesLeft(order.reservedUntil, now);
  const expired = mins !== null && mins <= 0;
  const declined = order.payment?.status === "declined" || order.payment?.status === "error";
  return (
    <div data-testid="pending-payment" role="status" className="mb-8 border border-white/30 bg-white/[0.03] p-5">
      <p className="font-display text-display-md">Tienes un pago pendiente</p>
      <p className="mt-2 text-sm text-white/70">
        {declined ? "El último intento de pago no se completó. " : "Saliste de la pasarela antes de terminar. "}
        Pedido #{order.orderNumber} por {formatCOP(order.total)}.{" "}
        {expired ? "La reserva de tus productos venció." : mins !== null ? `Tus productos están reservados ${mins <= 1 ? "un minuto más" : `${mins} minutos más`}.` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!expired && <Button variant="red" size="md" onClick={() => goToPayment(paymentDestination(last.payment), router.push)} data-testid="pending-resume">Reanudar pago</Button>}
        {discard}
      </div>
    </div>
  );
}
