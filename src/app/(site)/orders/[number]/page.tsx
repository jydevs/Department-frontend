import type { Metadata } from "next";
import { OrderStatusView } from "@/components/orders/OrderStatusView";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  robots: { index: false, follow: false },
  // the link carries the order's access token: never leak it through the Referer header
  referrer: "no-referrer",
};

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const n = Number(number);
  const t = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const token = t && /^[A-Za-z0-9_-]{20,128}$/.test(t) ? t : undefined;
  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Seguimiento</p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Tu pedido</h1>
        {Number.isInteger(n) && n > 0 ? (
          <OrderStatusView mode="tracking" number={n} token={token} />
        ) : (
          <OrderStatusView mode="tracking" />
        )}
      </div>
    </div>
  );
}
