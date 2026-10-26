"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { friendlyError } from "@/lib/api/errors";
import { cancelPendingOrder, type CancelResult } from "@/lib/checkout";

interface Props {
  orderNumber: number;
  token: string;
  /** texto del botón que abre la confirmación */
  label: string;
  /** botón principal (`red`) u opción secundaria (`outline`) */
  variant?: "red" | "outline";
  /** frase de la confirmación; por defecto la genérica */
  question?: string;
  /** la pasarela puede haber quedado abierta en otra pestaña (Wompi): se avisa de no completar el pago. La simulada (QA) no. */
  gatewayMayBeOpen?: boolean;
  disabled?: boolean;
  /** se llama con el resultado (cancelado, ya pagado o ya cerrado); el padre decide qué mostrar */
  onResult: (r: CancelResult) => void | Promise<void>;
  testId?: string;
}

/**
 * Cancelar un pedido pendiente EN EL SERVIDOR (libera el stock reservado). Pide confirmación en línea, avisa de que no se debe
 * completar un pago ya abierto, y ante un fallo (red, 429…) muestra el motivo y deja reintentar sin perder la confirmación.
 */
export function CancelOrder({ orderNumber, token, label, variant = "outline", question, gatewayMayBeOpen = true, disabled, onResult, testId = "cancel-order" }: Props) {
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);
  const descId = useId();

  const run = async () => {
    setStep("busy");
    setError(null);
    try {
      const r = await cancelPendingOrder(orderNumber, token);
      setStep("idle");
      await onResult(r);
    } catch (e) {
      setError(friendlyError(e, "No pudimos cancelar el pedido. Inténtalo de nuevo."));
      setStep("confirm");
    }
  };

  if (step === "idle") {
    return <Button variant={variant} size="md" disabled={disabled} onClick={() => setStep("confirm")} data-testid={testId}>{label}</Button>;
  }
  return (
    <div role="group" aria-labelledby={descId} data-testid={`${testId}-confirm`} className="w-full border border-white/30 bg-white/[0.04] p-4">
      <p id={descId} className="text-sm text-white/80">
        {question ?? `¿Cancelar el pedido #${orderNumber}?`} Se liberarán tus productos reservados y no se hará ningún cobro.
        {gatewayMayBeOpen && <strong className="mt-1 block font-medium text-dept-white">Si ya abriste la pasarela de pago, no completes el pago.</strong>}
      </p>
      {error && <p role="alert" data-testid={`${testId}-error`} className="mt-3 text-sm text-dept-red-light">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="red" size="md" disabled={step === "busy"} onClick={() => void run()} data-testid={`${testId}-yes`}>
          {step === "busy" ? "Cancelando…" : error ? "Reintentar" : "Sí, cancelar pedido"}
        </Button>
        <Button variant="outline" size="md" disabled={step === "busy"} onClick={() => { setError(null); setStep("idle"); }} data-testid={`${testId}-no`}>No, volver</Button>
      </div>
    </div>
  );
}
