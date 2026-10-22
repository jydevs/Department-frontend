"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ApiIssue } from "@/lib/cart/types";

type Outcome = "approved" | "declined";

/** Development-only payment simulator: reports the chosen result to the API's dev endpoint, then shows the result page. */
export function MockGateway({ reference, orderNumber }: { reference: string; orderNumber?: number }) {
  const router = useRouter();
  const [working, setWorking] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = async (status: Outcome) => {
    if (working) return;
    setWorking(status);
    setError(null);
    try {
      const res = await fetch("/api/checkout/mock-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: ApiIssue } | null;
        setError(data?.error?.message ?? "El simulador de pago no está disponible.");
        setWorking(null);
        return;
      }
      router.push(`/checkout/result${orderNumber ? `?order=${orderNumber}` : ""}`);
    } catch {
      setError("No pudimos conectar con la tienda. Inténtalo de nuevo.");
      setWorking(null);
    }
  };

  return (
    <div data-testid="mock-gateway" className="border border-white/20 p-8">
      <p className="font-condensed inline-block bg-dept-red px-2 py-1 text-[11px] tracking-[0.2em]">SOLO DESARROLLO</p>
      <h1 className="font-display text-display-md mt-4">Simulador de pasarela de pago</h1>
      <p className="mt-3 text-sm text-dept-white/70">
        Esta pantalla reemplaza a Wompi mientras no hay llaves configuradas. Referencia: <code data-testid="mock-reference" className="text-dept-white">{reference}</code>
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="red" size="lg" disabled={working !== null} onClick={() => pay("approved")} data-testid="mock-approve">
          {working === "approved" ? "Aprobando…" : "Aprobar pago"}
        </Button>
        <Button variant="outline" size="lg" disabled={working !== null} onClick={() => pay("declined")} data-testid="mock-decline">
          {working === "declined" ? "Rechazando…" : "Rechazar pago"}
        </Button>
      </div>
      <p role="alert" data-testid="mock-error" className="font-condensed mt-4 text-xs text-dept-red-light">{error}</p>
    </div>
  );
}
