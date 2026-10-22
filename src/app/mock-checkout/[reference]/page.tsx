import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MockGateway } from "@/components/checkout/MockGateway";
import { mockPaymentsAllowed } from "@/lib/checkout/server";

export const metadata: Metadata = {
  title: "Simulador de pago",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Stand-in for the payment gateway, ONLY outside production and while Wompi is not the configured provider. */
export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!mockPaymentsAllowed()) notFound();
  const [{ reference }, sp] = await Promise.all([params, searchParams]);
  const ref = decodeURIComponent(reference);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(ref)) notFound();
  const o = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const n = Number(o);
  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-xl">
        <MockGateway reference={ref} orderNumber={Number.isInteger(n) && n > 0 ? n : undefined} />
      </div>
    </div>
  );
}
