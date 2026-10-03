"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { APP_ENV } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Pasarela SIMULADA (solo QA con `PAYMENT_PROVIDER=mock` en la API). Reproduce lo que haría Wompi:
 * notifica el resultado al webhook (`POST /storefront/dev/mock-payment`) y vuelve a `/checkout/result`.
 */
export default function MockCheckoutPage() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (APP_ENV === "production") {
    return <div className="px-gutter pt-[calc(var(--chrome-h)+3rem)]"><p className="font-display text-display-lg">No disponible en producción</p></div>;
  }

  const pay = async (status: "approved" | "declined") => {
    setBusy(status);
    setError(null);
    try {
      await apiFetch("/storefront/dev/mock-payment", { method: "POST", body: { reference, status } });
      router.push("/checkout/result");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "La API no tiene activado el pago simulado (PAYMENT_PROVIDER=mock y MOCK_PAYMENTS_ENABLED=true)." : "No se pudo simular el pago.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+3rem)] pb-20">
      <div className="mx-auto max-w-xl border border-white/15 p-8">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-red-light">Pasarela de pruebas (QA)</p>
        <h1 className="font-display text-display-lg mb-4">Simular pago</h1>
        <p className="mb-8 break-all text-sm text-white/70">Referencia: <code>{reference}</code></p>
        {error && <p role="alert" className="mb-6 text-dept-red-light">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="red" size="lg" disabled={!!busy} onClick={() => void pay("approved")} data-testid="mock-approve">{busy === "approved" ? "Aprobando…" : "Aprobar pago"}</Button>
          <Button variant="outline" size="lg" disabled={!!busy} onClick={() => void pay("declined")} data-testid="mock-decline">{busy === "declined" ? "Rechazando…" : "Rechazar pago"}</Button>
        </div>
      </div>
    </div>
  );
}
