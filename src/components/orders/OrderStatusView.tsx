"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useOverlay } from "@/components/layout/OverlayProvider";
import { canOptimize, resolveMediaUrl } from "@/lib/api/media";
import { refreshCart } from "@/lib/cart";
import type { ApiIssue, CheckoutResult, OrderView } from "@/lib/cart/types";
import { paymentDestination } from "@/lib/checkout/payment";
import { orderPhase, safeHttpUrl, type OrderPhase } from "@/lib/checkout/status";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";

const POLL_MS = 2000;
const POLL_MAX_MS = 30_000;

interface Props {
  /** "result": the page the gateway returns to; "tracking": the public follow-up page */
  mode: "result" | "tracking";
  /** order number (tracking: from the URL; result: optional, defaults to this browser's last order) */
  number?: number;
  /** access token of the tracking link; otherwise the httpOnly cookie is used */
  token?: string;
}

interface Loaded {
  order: OrderView;
  canRetry: boolean;
  hasLines: boolean;
}

const COPY: Record<OrderPhase, { title: string; tone: "ok" | "wait" | "bad" }> = {
  paid: { title: "¡Pago recibido! Gracias por tu compra", tone: "ok" },
  pending: { title: "Estamos confirmando tu pago", tone: "wait" },
  declined: { title: "Tu pago no fue aprobado", tone: "bad" },
  cancelled: { title: "Este pedido fue cancelado", tone: "bad" },
  expired: { title: "Este pedido expiró", tone: "bad" },
};

const FULFILLMENT: Record<string, string> = {
  unfulfilled: "Preparando tu pedido",
  partial: "Enviado parcialmente",
  partially_fulfilled: "Enviado parcialmente",
  fulfilled: "Enviado",
};

function addressLines(a: Record<string, unknown> | null): string[] {
  if (!a) return [];
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  return [s("fullName"), [s("address1"), s("address2")].filter(Boolean).join(", "), [s("city"), s("department")].filter(Boolean).join(", "), s("phone")].filter(Boolean);
}

export function OrderStatusView({ mode, number, token }: Props) {
  const router = useRouter();
  const { openCart } = useOverlay();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<ApiIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [gaveUp, setGaveUp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState<null | "pay" | "restore">(null);
  const [confirmingCart, setConfirmingCart] = useState(false);
  const startedAt = useRef(0);
  const cartRefreshed = useRef(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (number) qs.set("number", String(number));
    if (token) qs.set("token", token);
    try {
      const res = await fetch(`/api/checkout/order?${qs}`, { cache: "no-store" });
      // the customer-session path answers with the account BFF's flat error (`{ code, message }`), the rest with `{ error }`
      const data = (await res.json().catch(() => null)) as ({ order?: OrderView; canRetry?: boolean; hasLines?: boolean; error?: ApiIssue; code?: string; message?: string }) | null;
      if (res.ok && data?.order) {
        setLoaded({ order: data.order, canRetry: Boolean(data.canRetry), hasLines: Boolean(data.hasLines) });
        setError(null);
      } else {
        setError(data?.error ?? { code: data?.code ?? "HTTP", status: res.status, message: data?.code && data.message ? data.message : "No pudimos consultar tu pedido." });
      }
    } catch {
      setError({ code: "NETWORK", status: 0, message: "No pudimos conectar con la tienda. Revisa tu conexión." });
    } finally {
      setLoading(false);
    }
  }, [number, token]);

  useEffect(() => {
    startedAt.current = Date.now();
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const phase = loaded ? orderPhase(loaded.order) : null;

  // gentle polling while the payment is pending: every 2 s for up to 30 s
  useEffect(() => {
    if (phase !== "pending") return;
    if (Date.now() - startedAt.current >= POLL_MAX_MS) {
      setGaveUp(true);
      return;
    }
    const t = setTimeout(() => void load(), POLL_MS);
    return () => clearTimeout(t);
  }, [phase, loaded, load]);

  // the server already turned the cart into this order: re-read it so the header / drawer show the real (empty) cart
  useEffect(() => {
    if (mode === "result" && phase !== null && !cartRefreshed.current) {
      cartRefreshed.current = true;
      void refreshCart();
    }
  }, [mode, phase]);

  const retryPayment = async () => {
    if (!loaded) return;
    setActing("pay");
    setActionError(null);
    try {
      const res = await fetch("/api/checkout/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: loaded.order.orderNumber, token }) });
      const data = (await res.json().catch(() => null)) as ({ orderNumber?: number; payment?: CheckoutResult["payment"]; error?: ApiIssue }) | null;
      if (!res.ok || !data?.payment) {
        setActionError(data?.error?.message ?? "No pudimos reabrir el pago.");
        if (res.status === 409) void load();
        setActing(null);
        return;
      }
      const dest = paymentDestination(data.payment, loaded.order.orderNumber);
      if (!dest) {
        setActionError("El pago no está disponible por ahora.");
        setActing(null);
        return;
      }
      if (dest.external) window.location.assign(dest.url);
      else router.push(dest.url);
    } catch {
      setActionError("No pudimos conectar con la tienda. Inténtalo de nuevo.");
      setActing(null);
    }
  };

  const backToCart = async () => {
    if (!loaded) return;
    setActing("restore");
    setActionError(null);
    try {
      const res = await fetch("/api/cart/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: loaded.order.orderNumber, token }) });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: ApiIssue } | null;
        setActionError(data?.error?.message ?? "No pudimos recuperar tu carrito.");
        setActing(null);
        return;
      }
      await refreshCart();
      setActing(null);
      openCart();
    } catch {
      setActionError("No pudimos conectar con la tienda. Inténtalo de nuevo.");
      setActing(null);
    }
  };

  /* ── no order to show ── */
  if (loading && !loaded) {
    return (
      <p role="status" data-testid="order-loading" className="font-condensed py-16 text-sm tracking-[0.12em] text-dept-gray-300">
        Consultando tu pedido…
      </p>
    );
  }
  if (!loaded || !phase) {
    // 401 = no tracking token and no (valid) customer session: logging in is the way out, and it returns here with the
    // session, which the page then uses to read the order from the account. Anything else (404, 5xx) is not a login problem.
    const needsLogin = error?.status === 401;
    const message =
      error?.status === 404 && !token
        ? "No encontramos ese pedido en este navegador ni en tu cuenta. Si lo compraste como invitado, abre el enlace de seguimiento del correo de confirmación."
        : (error?.message ?? "No encontramos un pedido reciente en este navegador.");
    return (
      <div data-testid="order-unavailable" role="alert" className="border border-white/15 p-8 sm:p-12">
        <p className="font-display text-display-md">{needsLogin ? "Necesitamos verificar que el pedido es tuyo" : "No encontramos tu pedido"}</p>
        <p className="mt-3 max-w-[56ch] text-sm text-dept-white/70">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {needsLogin && (
            <Button href={`/account/login?next=${encodeURIComponent(number ? `/orders/${number}` : "/account/orders")}`} variant="red" size="lg" arrow>
              Iniciar sesión
            </Button>
          )}
          {error && error.status !== 404 && error.status !== 401 && (
            <Button variant="outline" size="lg" onClick={() => { setLoading(true); void load(); }}>
              Reintentar
            </Button>
          )}
          <Button href="/collections/all" variant="outline" size="lg">
            Seguir comprando
          </Button>
        </div>
      </div>
    );
  }

  const { order } = loaded;
  const copy = COPY[phase];
  const address = addressLines(order.shippingAddress);

  return (
    <div data-testid="order-status" data-phase={phase} className="space-y-10">
      <section aria-live="polite" className={clsx("border p-6 sm:p-8", copy.tone === "ok" ? "border-white/40 bg-white/[0.04]" : copy.tone === "bad" ? "border-dept-red bg-dept-red/10" : "border-white/20")}>
        <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-dept-gray-300">Pedido #{order.orderNumber}</p>
        <h2 data-testid="order-title" className="font-display text-display-md mt-2 text-dept-white">
          {mode === "tracking" && phase === "paid" ? "Seguimiento de tu pedido" : copy.title}
        </h2>

        {phase === "paid" && (
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-dept-white/75">
            Te enviamos la confirmación a <strong className="text-dept-white">{order.email}</strong>. Estado actual: <strong className="text-dept-white">{FULFILLMENT[order.fulfillmentStatus] ?? order.fulfillmentStatus}</strong>.
            {" "}Cuando despachemos tu pedido verás aquí la guía de seguimiento.
          </p>
        )}
        {phase === "pending" && (
          <div className="mt-3 max-w-[60ch] space-y-2 text-sm leading-relaxed text-dept-white/75">
            <p>
              La pasarela puede tardar unos minutos en confirmarnos el pago. <strong className="text-dept-white">No repitas el pago</strong>: esta página se actualiza sola
              {gaveUp ? "" : " y estamos verificando ahora mismo"}.
            </p>
            {gaveUp && (
              <p>
                Seguimos esperando la confirmación. Si el dinero ya salió de tu cuenta, tu pedido se actualizará en cuanto llegue; también te avisaremos por correo.
              </p>
            )}
            {gaveUp && (
              <Button variant="outline" size="md" onClick={() => { startedAt.current = Date.now(); setGaveUp(false); void load(); }} data-testid="order-refresh">
                Actualizar estado
              </Button>
            )}
          </div>
        )}
        {phase === "declined" && (
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-dept-white/75">
            La pasarela no aprobó el pago{order.payment?.method ? ` (${order.payment.method})` : ""}. No se te cobró. Tus productos siguen reservados
            {order.reservedUntil ? ` hasta las ${new Date(order.reservedUntil).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}` : " por un tiempo limitado"}: puedes intentarlo de nuevo con otro medio de pago.
          </p>
        )}
        {(phase === "cancelled" || phase === "expired") && (
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-dept-white/75">
            {phase === "expired" ? "El tiempo para pagar este pedido terminó y liberamos los productos." : "El pago no se completó y liberamos los productos."} No se te cobró nada.
            Puedes volver a armar tu carrito y comprar de nuevo.
          </p>
        )}

        {phase === "pending" && loaded.canRetry && (
          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-dept-white/75" data-testid="order-pending-hint">
            {order.reservedUntil ? `Tus productos siguen reservados hasta las ${new Date(order.reservedUntil).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}: ` : ""}
            si cerraste la pasarela sin terminar, puedes continuar con el pago del mismo pedido sin que se cobre dos veces.
          </p>
        )}
        {confirmingCart && phase === "pending" && (
          <p role="alert" data-testid="order-cart-warning" className="mt-4 max-w-[60ch] border border-white/20 p-3 text-sm leading-relaxed text-dept-white/80">
            Este pedido todavía puede cobrarse{order.reservedUntil ? ` (sus productos siguen reservados hasta las ${new Date(order.reservedUntil).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })})` : ""}.
            Si vuelves al carrito y pagas de nuevo, <strong className="text-dept-white">podrías pagar dos veces</strong>. Hazlo solo si ya no quieres pagar este pedido.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {(phase === "declined" || phase === "pending") && loaded.canRetry && (
            <Button variant="red" size="lg" arrow disabled={acting !== null} onClick={retryPayment} data-testid="order-retry-pay">
              {acting === "pay" ? "Abriendo la pasarela…" : phase === "pending" ? "Continuar con el pago" : "Reintentar el pago"}
            </Button>
          )}
          {(phase === "declined" || phase === "cancelled" || phase === "expired" || phase === "pending") && loaded.hasLines && (
            <Button
              variant="outline"
              size="lg"
              disabled={acting !== null}
              onClick={phase === "pending" && !confirmingCart ? () => setConfirmingCart(true) : backToCart}
              data-testid="order-back-to-cart"
            >
              {acting === "restore" ? "Recuperando…" : confirmingCart ? "Sí, volver al carrito" : "Volver al carrito"}
            </Button>
          )}
          <Button href="/collections/all" variant={phase === "paid" ? "red" : "outline"} size="lg" arrow={phase === "paid"} data-testid="order-continue">
            Seguir comprando
          </Button>
        </div>
        <p role="alert" data-testid="order-action-error" className="font-condensed mt-3 text-xs text-dept-red-light">{actionError}</p>
      </section>

      {order.fulfillments.length > 0 && (
        <section aria-labelledby="ful-h" data-testid="order-fulfillments">
          <h3 id="ful-h" className="font-display text-display-md mb-4">Envíos</h3>
          <ul className="space-y-3">
            {order.fulfillments.map((f, i) => {
              const url = safeHttpUrl(f.trackingUrl);
              return (
                <li key={i} className="font-condensed border border-white/15 p-4 text-xs leading-relaxed tracking-[0.08em]">
                  {f.carrier && <span className="block text-dept-white">{f.carrier}</span>}
                  {f.trackingNumber && <span className="block text-dept-gray-300">Guía: {f.trackingNumber}</span>}
                  <span className="block text-dept-gray-500">Enviado el {new Date(f.shippedAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</span>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-dept-white underline underline-offset-4">
                      Rastrear envío<span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-12">
        <section aria-labelledby="items-h" className="md:col-span-7">
          <h3 id="items-h" className="font-display text-display-md mb-4">Tu pedido</h3>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {order.lines.map((l, i) => {
              const img = resolveMediaUrl(l.imageUrl);
              return (
                <li key={i} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 py-3">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-dept-gray-900">
                    {img && <Image src={img} unoptimized={!canOptimize(img)} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <span className="font-condensed min-w-0 text-xs tracking-[0.08em]">
                    {l.productHandle ? (
                      <Link href={`/products/${l.productHandle}`} className="block underline-offset-4 hover:underline">{l.title}</Link>
                    ) : (
                      <span className="block">{l.title}</span>
                    )}
                    {l.variantTitle && l.variantTitle.toLowerCase() !== "default title" && <span className="block text-dept-gray-500">Talla {l.variantTitle}</span>}
                    <span className="block text-dept-gray-500">{l.quantity} × {formatCOP(l.unitPrice)}</span>
                  </span>
                  <span className="font-condensed text-xs tabular-nums">{formatCOP(l.lineTotal)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="sum-h" className="md:col-span-5">
          <h3 id="sum-h" className="font-display text-display-md mb-4">Resumen</h3>
          <dl className="font-condensed space-y-2 text-xs tracking-[0.1em]">
            <div className="flex justify-between text-dept-gray-400"><dt>Subtotal</dt><dd className="tabular-nums text-dept-white">{formatCOP(order.subtotal)}</dd></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-dept-gray-400"><dt>Descuento{order.discountCode ? ` (${order.discountCode})` : ""}</dt><dd className="tabular-nums text-dept-white">−{formatCOP(order.discountTotal)}</dd></div>}
            <div className="flex justify-between text-dept-gray-400"><dt>Envío{order.shippingRateName ? ` · ${order.shippingRateName}` : ""}</dt><dd className="tabular-nums text-dept-white">{order.shippingTotal === 0 ? "Gratis" : formatCOP(order.shippingTotal)}</dd></div>
            <div className="flex justify-between text-dept-gray-400"><dt>IVA incluido</dt><dd className="tabular-nums text-dept-white">{formatCOP(order.taxTotal)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-semibold text-dept-white"><dt>Total</dt><dd data-testid="order-total" className="tabular-nums">{formatCOP(order.total)}</dd></div>
          </dl>
          {address.length > 0 && (
            <div className="mt-8">
              <h4 className="font-condensed mb-2 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">Enviar a</h4>
              <address className="text-sm not-italic leading-relaxed text-dept-white/75">
                {address.map((l, i) => (<span key={i} className="block">{l}</span>))}
              </address>
            </div>
          )}
          <p className="font-condensed mt-8 text-[11px] tracking-[0.1em] text-dept-gray-500">
            ¿Dudas? Escríbenos desde <Link href="/pages/contact" className="underline underline-offset-4">Contacto</Link> con tu número de pedido.
          </p>
        </section>
      </div>
    </div>
  );
}
