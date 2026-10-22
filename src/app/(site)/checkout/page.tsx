import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Proceso de compra</p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Finalizar compra</h1>
        <CheckoutForm />
      </div>
    </div>
  );
}
