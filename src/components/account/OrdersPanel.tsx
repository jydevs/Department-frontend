"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { canOptimize, resolveMediaUrl } from "@/lib/api/media";
import { describeError } from "@/lib/account/errors";
import { FULFILLMENT_STATUS, ORDER_STATUS, PAYMENT_STATUS, formatDate, label, safeExternalUrl } from "@/lib/account/labels";
import type { OrderDetail, OrderPage } from "@/lib/account/types";
import { useCustomer } from "@/lib/account/useCustomer";
import { formatCOP } from "@/lib/format";
import { Notice, Spinner, linkClass, secondaryBtn } from "./ui";

const PAGE_SIZE = 10;

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" }) {
  const cls = tone === "good" ? "border-emerald-400/50 text-emerald-300" : tone === "bad" ? "border-dept-red-light/50 text-dept-red-light" : "border-white/25 text-dept-gray-300";
  return <span className={`font-condensed inline-block border px-2 py-0.5 text-[10px] tracking-[0.14em] ${cls}`}>{children}</span>;
}

const paymentTone = (s: string) => (s === "paid" ? "good" : s === "failed" ? "bad" : "neutral");

const fmtMoney = (n: number, currency: string) => (currency === "COP" ? formatCOP(n) : `${n} ${currency}`);

export function OrdersPanel() {
  const { request } = useCustomer();
  const [data, setData] = useState<OrderPage | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (target: number) => {
      setLoading(true);
      const paged = await request<OrderPage>(`/me/orders?page=${target}&pageSize=${PAGE_SIZE}`);
      setLoading(false);
      if (paged.ok && paged.data) {
        setData(paged.data);
        setPage(target);
        setError(null);
      } else if (paged.status !== 401) setError(describeError(paged.error, paged.status));
    },
    [request],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load(1));
  }, [load]);

  if (!data) {
    if (error) {
      return (
        <div data-testid="orders-page" className="space-y-4">
          <Notice kind="error" testId="orders-error">{error}</Notice>
          <button type="button" onClick={() => void load(1)} className={secondaryBtn}>Reintentar</button>
        </div>
      );
    }
    return (
      <div data-testid="orders-page">
        <Spinner label="Cargando tus pedidos…" />
      </div>
    );
  }

  return (
    <div data-testid="orders-page" className="space-y-6">
      <h2 className="font-display text-display-md text-dept-white">Historial de pedidos</h2>
      <Notice kind="error" testId="orders-error">{error}</Notice>

      {data.items.length === 0 ? (
        <div data-testid="orders-empty" className="border border-white/10 bg-white/[0.02] p-8 text-center sm:py-16">
          <p className="font-display text-display-md mb-2 text-dept-white">No tienes pedidos recientes</p>
          <p className="font-condensed mb-6 text-xs tracking-[0.1em] text-dept-gray-400">Cuando realices una compra, podrás ver el seguimiento aquí.</p>
          <Button href="/collections/all" variant="red" size="md" arrow>
            Explorar catálogo
          </Button>
        </div>
      ) : (
        <>
          <ul className={loading ? "space-y-3 opacity-60 transition-opacity" : "space-y-3"} aria-busy={loading}>
            {data.items.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  data-testid="order-row"
                  className="grid gap-3 border border-white/15 bg-white/[0.02] p-5 transition-colors hover:border-white/50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-display text-display-md text-dept-white">Pedido #{o.orderNumber}</p>
                    <p className="font-condensed mt-1 text-xs tracking-[0.08em] text-dept-gray-500">
                      {formatDate(o.createdAt)} · {o.itemCount} {o.itemCount === 1 ? "artículo" : "artículos"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>{label(ORDER_STATUS, o.status)}</Badge>
                      <Badge tone={paymentTone(o.paymentStatus)}>{label(PAYMENT_STATUS, o.paymentStatus)}</Badge>
                      <Badge>{label(FULFILLMENT_STATUS, o.fulfillmentStatus)}</Badge>
                    </div>
                  </div>
                  <p className="font-condensed text-sm tracking-[0.06em] text-dept-white sm:text-right">{fmtMoney(o.total, o.currency)}</p>
                </Link>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <nav aria-label="Paginación de pedidos" className="flex items-center justify-between gap-4 pt-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1)} className={secondaryBtn}>
                Anterior
              </button>
              <span className="font-condensed text-xs tracking-[0.12em] text-dept-gray-300" aria-live="polite">
                Página {data.page} de {data.totalPages}
              </span>
              <button type="button" disabled={page >= data.totalPages || loading} onClick={() => void load(page + 1)} className={secondaryBtn}>
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

const ADDRESS_ROWS: [string, string][] = [
  ["fullName", ""],
  ["address1", ""],
  ["address2", ""],
];

function AddressBlock({ title, address }: { title: string; address: Record<string, unknown> }) {
  const str = (k: string) => (typeof address[k] === "string" ? (address[k] as string) : "");
  const cityLine = [str("city"), str("department")].filter(Boolean).join(", ");
  const lines = [...ADDRESS_ROWS.map(([k]) => str(k)), cityLine, str("phone")].filter(Boolean);
  return (
    <div>
      <h3 className="font-condensed mb-2 text-[11px] tracking-[0.2em] text-dept-gray-500">{title}</h3>
      <address className="font-condensed space-y-1 text-sm not-italic tracking-[0.04em] text-dept-gray-300">
        {lines.map((l, i) => (
          <p key={i} className={i === 0 ? "text-dept-white" : undefined}>{l}</p>
        ))}
      </address>
    </div>
  );
}

export function OrderDetailPanel({ orderNumber }: { orderNumber: string }) {
  const { request } = useCustomer();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await request<OrderDetail>(`/me/orders/${orderNumber}`);
    if (res.ok && res.data) {
      setOrder(res.data);
      setError(null);
    } else if (res.status !== 401) {
      setError({ text: res.status === 404 ? "No encontramos ese pedido en tu cuenta." : describeError(res.error, res.status), notFound: res.status === 404 });
    }
  }, [request, orderNumber]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const back = (
    <Link href="/account/orders" className={`font-condensed text-xs tracking-[0.14em] ${linkClass}`}>
      ← Volver a mis pedidos
    </Link>
  );

  if (!order) {
    if (error) {
      return (
        <div data-testid="order-detail-error" className="space-y-6">
          <Notice kind="error">{error.text}</Notice>
          {!error.notFound && <button type="button" onClick={() => void load()} className={secondaryBtn}>Reintentar</button>}
          {back}
        </div>
      );
    }
    return <Spinner label="Cargando el pedido…" />;
  }

  return (
    <div data-testid="order-detail" className="space-y-10">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-display-lg text-dept-white">Pedido #{order.orderNumber}</h2>
          <p className="font-condensed mt-2 text-xs tracking-[0.08em] text-dept-gray-500">Realizado el {formatDate(order.createdAt, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{label(ORDER_STATUS, order.status)}</Badge>
          <Badge tone={paymentTone(order.paymentStatus)}>{label(PAYMENT_STATUS, order.paymentStatus)}</Badge>
          <Badge>{label(FULFILLMENT_STATUS, order.fulfillmentStatus)}</Badge>
        </div>
      </div>

      <section aria-labelledby="lines-h">
        <h3 id="lines-h" className="font-condensed mb-4 text-[11px] tracking-[0.2em] text-dept-gray-500">ARTÍCULOS</h3>
        <ul className="divide-y divide-white/10 border border-white/15">
          {order.lines.map((l, i) => {
            const src = resolveMediaUrl(l.imageUrl);
            return (
              <li key={`${l.sku ?? l.title}-${i}`} className="flex gap-4 p-4">
                <div className="relative h-20 w-16 shrink-0 bg-white/5">
                  {src && <Image src={src} alt="" fill sizes="64px" className="object-cover" unoptimized={!canOptimize(src)} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-condensed text-sm tracking-[0.06em] text-dept-white">{l.title}</p>
                  {l.variantTitle && l.variantTitle !== "Default Title" && <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-500">{l.variantTitle}</p>}
                  <p className="font-condensed mt-1 text-xs tracking-[0.08em] text-dept-gray-300">
                    {l.quantity} × {fmtMoney(l.unitPrice, order.currency)}
                    {l.refundedQuantity > 0 ? ` · ${l.refundedQuantity} reembolsado(s)` : ""}
                  </p>
                </div>
                <p className="font-condensed text-sm tracking-[0.06em] text-dept-white">{fmtMoney(l.lineTotal, order.currency)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="ship-h" className="space-y-6">
          <h3 id="ship-h" className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">ENVÍO</h3>
          <AddressBlock title="Dirección de entrega" address={order.shippingAddress} />
          {order.shippingRateName && <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-300">Método: {order.shippingRateName}</p>}

          {order.fulfillments.length === 0 ? (
            <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-500" data-testid="order-no-tracking">
              Aún no hay información de seguimiento. Te avisaremos por correo cuando se envíe.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="order-fulfillments">
              {order.fulfillments.map((f, i) => {
                const url = safeExternalUrl(f.trackingUrl);
                return (
                  <li key={i} className="font-condensed space-y-1 border border-white/15 p-4 text-xs tracking-[0.08em] text-dept-gray-300">
                    <p className="text-dept-white">Enviado el {formatDate(f.shippedAt)}</p>
                    {f.carrier && <p>Transportadora: {f.carrier}</p>}
                    {f.trackingNumber && <p>Guía: <span className="text-dept-white">{f.trackingNumber}</span></p>}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid="order-tracking-link">
                        Seguir mi envío
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="total-h">
          <h3 id="total-h" className="font-condensed mb-4 text-[11px] tracking-[0.2em] text-dept-gray-500">RESUMEN</h3>
          <dl className="font-condensed space-y-2 text-sm tracking-[0.06em] text-dept-gray-300">
            <Row k="Subtotal" v={fmtMoney(order.subtotal, order.currency)} />
            {order.discountTotal > 0 && <Row k={order.discountCode ? `Descuento (${order.discountCode})` : "Descuento"} v={`-${fmtMoney(order.discountTotal, order.currency)}`} />}
            <Row k="Envío" v={fmtMoney(order.shippingTotal, order.currency)} />
            <Row k="Impuestos" v={fmtMoney(order.taxTotal, order.currency)} />
            {order.totalRefunded > 0 && <Row k="Reembolsado" v={`-${fmtMoney(order.totalRefunded, order.currency)}`} />}
            <div className="flex justify-between border-t border-white/15 pt-3 text-base text-dept-white">
              <dt>Total</dt>
              <dd data-testid="order-total">{fmtMoney(order.total, order.currency)}</dd>
            </div>
          </dl>
          {order.paidAt && <p className="font-condensed mt-4 text-xs tracking-[0.08em] text-dept-gray-500">Pagado el {formatDate(order.paidAt, true)}</p>}
          {order.customerNote && <p className="font-condensed mt-4 text-xs tracking-[0.08em] text-dept-gray-300">Nota: {order.customerNote}</p>}
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
