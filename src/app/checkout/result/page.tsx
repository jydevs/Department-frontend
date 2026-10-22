import type { Metadata } from "next";
import { OrderStatusView } from "@/components/orders/OrderStatusView";

export const metadata: Metadata = {
  title: "Resultado de tu pago",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Where the payment gateway sends the buyer back (Wompi appends `?id=<transaction>`; the mock adds `?order=<n>`).
 * The order itself is found through the httpOnly cookie set when the order was created.
 */
export default async function CheckoutResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const n = Number(raw);
  const number = Number.isInteger(n) && n > 0 ? n : undefined;
  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Proceso de compra</p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Tu pedido</h1>
        <OrderStatusView mode="result" number={number} />
      </div>
    </div>
  );
}
