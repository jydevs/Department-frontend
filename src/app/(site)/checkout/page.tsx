"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [shippingZone, setShippingZone] = useState("bogota");
  const [error, setError] = useState<string | null>(null);

  const baseSubtotal = subtotal > 0 ? subtotal : 99000;
  const tax = Math.round(baseSubtotal * 0.19);
  const total = baseSubtotal + tax;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Introduce un correo electrónico válido");
      return;
    }
    setError(null);
  };

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">
          Proceso de compra
        </p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Checkout</h1>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-7">
            <form data-testid="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-6">
              {error && (
                <div data-testid="checkout-error" className="border border-dept-red bg-dept-red/10 p-4 font-condensed text-xs tracking-[0.1em] text-dept-red-light">
                  {error}
                </div>
              )}

              <div>
                <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  data-testid="checkout-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  placeholder="ejemplo@correo.com"
                  className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
                />
              </div>

              <div>
                <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
                  Dirección de entrega *
                </label>
                <input
                  type="text"
                  data-testid="checkout-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Calle, número, apartamento"
                  className="w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
                />
              </div>

              <div>
                <label className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">
                  Zona de envío
                </label>
                <select
                  data-testid="shipping-zone-select"
                  value={shippingZone}
                  onChange={(e) => setShippingZone(e.target.value)}
                  className="w-full border border-white/20 bg-dept-black px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white"
                >
                  <option value="bogota">Bogotá D.C.</option>
                  <option value="medellin">Medellín</option>
                  <option value="cali">Cali</option>
                  <option value="nacional">Otras ciudades (Nacional)</option>
                </select>
              </div>

              <Button type="submit" variant="red" size="lg" data-testid="checkout-submit" className="w-full mt-4">
                Completar pedido
              </Button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5">
            <div data-testid="order-summary" className="border border-white/15 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="font-display text-display-md text-dept-white mb-6 border-b border-white/10 pb-4">
                Resumen del pedido
              </h2>

              <div className="space-y-4 font-condensed text-xs tracking-[0.1em]">
                {items.length > 0 ? (
                  <ul className="divide-y divide-white/10 pb-4">
                    {items.map((it) => (
                      <li key={`${it.handle}-${it.size}`} className="py-3 flex justify-between">
                        <span>{it.product.name} (Talla {it.size}) × {it.qty}</span>
                        <span className="text-dept-white tabular-nums">{formatCOP(it.total)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-dept-gray-400 py-2">1 producto en orden de prueba</p>
                )}

                <div className="flex justify-between border-t border-white/10 pt-4 text-dept-gray-400">
                  <span>Subtotal</span>
                  <span data-testid="checkout-subtotal" className="text-dept-white tabular-nums">
                    {formatCOP(baseSubtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-dept-gray-400">
                  <span>IVA (19%)</span>
                  <span data-testid="checkout-tax" className="text-dept-white tabular-nums">
                    {formatCOP(tax)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-semibold text-dept-white">
                  <span>Total</span>
                  <span data-testid="checkout-total" className="text-dept-white tabular-nums text-base">
                    {formatCOP(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
