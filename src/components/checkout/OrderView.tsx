import Image from "next/image";
import type { ApiPublicOrder } from "@/lib/api/types";
import { formatCOP } from "@/lib/format";

export const PAYMENT_LABEL: Record<string, string> = { pending: "Pago pendiente", paid: "Pagado", partially_refunded: "Reembolso parcial", refunded: "Reembolsado", failed: "Pago rechazado", voided: "Pago anulado" };
export const FULFILL_LABEL: Record<string, string> = { unfulfilled: "Sin enviar", partial: "Envío parcial", fulfilled: "Enviado" };

/** Resumen de un pedido (público por token o de la cuenta): líneas, totales, dirección y envíos. */
export function OrderView({ order }: { order: ApiPublicOrder }) {
  const a = order.shippingAddress;
  return (
    <div data-testid="order-view" className="space-y-10">
      <dl className="grid gap-6 sm:grid-cols-3">
        <div><dt className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">Pedido</dt><dd className="font-display text-display-md">#{order.orderNumber}</dd></div>
        <div><dt className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">Pago</dt><dd data-testid="order-payment-status" className="font-condensed text-lg tracking-[0.08em]">{PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd></div>
        <div><dt className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">Envío</dt><dd className="font-condensed text-lg tracking-[0.08em]">{order.status === "cancelled" ? "Cancelado" : (FULFILL_LABEL[order.fulfillmentStatus] ?? order.fulfillmentStatus)}</dd></div>
      </dl>

      <ul className="divide-y divide-white/10 border-y border-white/10">
        {order.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-dept-gray-900">{l.imageUrl && <Image src={l.imageUrl} alt={l.title} fill sizes="64px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-condensed text-[13px] tracking-[0.1em]">{l.title}</p>
              <p className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">{l.variantTitle} × {l.quantity}{l.fulfilledQuantity ? ` · enviadas ${l.fulfilledQuantity}` : ""}</p>
            </div>
            <p className="font-condensed text-[13px] tabular-nums">{formatCOP(l.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-2 font-condensed text-xs tracking-[0.1em]">
          {([["Subtotal", order.subtotal], ["Descuento", -order.discountTotal], [order.shippingRateName ? `Envío (${order.shippingRateName})` : "Envío", order.shippingTotal]] as [string, number][]).map(([k, v]) =>
            v !== 0 || k === "Subtotal" ? <div key={k} className="flex justify-between text-dept-gray-300"><span>{k}</span><span className="tabular-nums text-dept-white">{formatCOP(v)}</span></div> : null,
          )}
          <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-semibold"><span>Total</span><span data-testid="order-total" className="tabular-nums">{formatCOP(order.total)}</span></div>
          <p className="pt-1 text-[11px] text-dept-gray-500">IVA incluido ({formatCOP(order.taxTotal)})</p>
        </div>
        <div className="space-y-6 text-sm text-dept-white/80">
          <address className="not-italic leading-relaxed">
            <p className="font-condensed mb-2 text-[11px] tracking-[0.2em] text-dept-gray-500">Entrega</p>
            {a.fullName}<br />{a.address1}{a.address2 ? `, ${a.address2}` : ""}<br />{a.city}, {a.department}<br />{a.phone}
          </address>
          {order.fulfillments.length > 0 && (
            <div>
              <p className="font-condensed mb-2 text-[11px] tracking-[0.2em] text-dept-gray-500">Seguimiento</p>
              <ul className="space-y-1">{order.fulfillments.map((f, i) => <li key={i}>{f.carrier ?? "Transportadora"} · {f.trackingNumber ?? "sin guía"}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
