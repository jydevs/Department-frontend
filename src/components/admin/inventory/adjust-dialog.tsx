"use client";

import { useState } from "react";
import { Button, Dialog, Input, Select, Textarea, useToast } from "@/components/admin/ui";
import { ADJUST_REASONS, QTY_MAX, inventoryApi, useInvalidateInventory, type AdjustInput, type AdjustReason, type Location } from "@/lib/admin/api/inventory";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { formatNumber } from "@/lib/admin/format";

export interface AdjustTarget {
  variantId: string;
  variantTitle: string;
  variantSku: string | null;
  productTitle?: string;
}

export interface LevelSnapshot {
  locationId: string;
  onHand: number;
  reserved: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: AdjustTarget | null;
  locations: Location[];
  /** Niveles conocidos de esta variante (para calcular el resultado). */
  levels: LevelSnapshot[];
  initialLocationId?: string;
  onDone?: () => void;
}

const MAX_ON_HAND = 1_000_000_000;

export function AdjustDialog({ open, onClose, target, locations, levels, initialLocationId, onDone }: Props) {
  // el contenido se monta de nuevo cada vez que se abre (key) para reiniciar el formulario
  if (!open || !target) return null;
  return <AdjustForm key={`${target.variantId}:${initialLocationId ?? ""}`} onClose={onClose} target={target} locations={locations} levels={levels} initialLocationId={initialLocationId} onDone={onDone} />;
}

function AdjustForm({ onClose, target, locations, levels, initialLocationId, onDone }: Omit<Props, "open"> & { target: AdjustTarget }) {
  const toast = useToast();
  const invalidate = useInvalidateInventory();
  const active = locations.filter((l) => l.isActive);
  const [locationId, setLocationId] = useState(initialLocationId && active.some((l) => l.id === initialLocationId) ? initialLocationId : (active.find((l) => l.isDefault) ?? active[0])?.id ?? "");
  const [mode, setMode] = useState<"delta" | "set">("delta");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<AdjustReason>("received");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const level = levels.find((l) => l.locationId === locationId);
  const onHand = level?.onHand ?? 0;
  const reserved = level?.reserved ?? 0;

  const n = qty.trim() === "" ? null : Number(qty);
  let qtyError: string | null = null;
  let result: number | null = null;
  if (n !== null) {
    if (!Number.isInteger(n)) qtyError = "Debe ser un número entero.";
    else if (mode === "delta") {
      if (n === 0) qtyError = "El ajuste no puede ser 0.";
      else if (Math.abs(n) > QTY_MAX) qtyError = `Máximo ±${formatNumber(QTY_MAX)}.`;
      else result = onHand + n;
    } else {
      if (n < 0) qtyError = "No puede ser negativo.";
      else if (n > QTY_MAX) qtyError = `Máximo ${formatNumber(QTY_MAX)}.`;
      else result = n;
    }
    if (!qtyError && result !== null) {
      if (result < 0) qtyError = "No puede dejar el stock por debajo de 0.";
      else if (result < reserved) qtyError = `No puede quedar por debajo de lo reservado (${formatNumber(reserved)}).`;
      else if (result > MAX_ON_HAND) qtyError = "Cantidad demasiado grande.";
      else if (result === onHand) qtyError = "El ajuste no cambia el stock.";
    }
  }
  const noteError = note.length > 1000 ? "Máximo 1000 caracteres." : null;
  const canSubmit = !!locationId && n !== null && !qtyError && !noteError && !busy;

  const submit = async () => {
    if (!canSubmit || n === null) return;
    setBusy(true);
    setServerError(null);
    const body: AdjustInput = { variantId: target.variantId, locationId, reason, ...(mode === "delta" ? { delta: n } : { setTo: n }), ...(note.trim() ? { note: note.trim() } : {}) };
    try {
      await inventoryApi.adjust(body);
      await invalidate();
      toast.success("Stock actualizado.");
      onDone?.();
      onClose();
    } catch (e) {
      setServerError(e instanceof ApiError && e.code === "INSUFFICIENT_STOCK" ? "El ajuste dejaría el stock por debajo de 0 o de lo reservado." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!busy}
      title="Ajustar inventario"
      description={`${target.productTitle ? `${target.productTitle} · ` : ""}${target.variantTitle}${target.variantSku ? ` (${target.variantSku})` : ""}`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} disabled={!canSubmit} onClick={() => void submit()}>
            Guardar ajuste
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {active.length === 0 ? (
          <p role="alert" className="text-sm text-danger">
            No hay ubicaciones activas. Crea una en la pestaña Ubicaciones.
          </p>
        ) : (
          <Select label="Ubicación" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {active.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.isDefault ? " (principal)" : ""}
              </option>
            ))}
          </Select>
        )}
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-surface-2 p-3 text-center text-sm">
          <div>
            <dt className="text-xs text-muted">En mano</dt>
            <dd className="text-base font-semibold tabular-nums">{formatNumber(onHand)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Reservado</dt>
            <dd className="text-base font-semibold tabular-nums">{formatNumber(reserved)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Quedará en</dt>
            <dd className="text-base font-semibold tabular-nums">{result !== null && !qtyError ? formatNumber(result) : "—"}</dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Tipo de ajuste" value={mode} onChange={(e) => { setMode(e.target.value === "set" ? "set" : "delta"); setQty(""); }}>
            <option value="delta">Sumar o restar</option>
            <option value="set">Fijar cantidad</option>
          </Select>
          <Input
            data-autofocus=""
            label={mode === "delta" ? "Cantidad (usa − para restar)" : "Nueva cantidad en mano"}
            type="number"
            inputMode="numeric"
            step={1}
            value={qty}
            error={qtyError}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <Select label="Motivo" value={reason} onChange={(e) => setReason(e.target.value as AdjustReason)}>
          {ADJUST_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <Textarea label="Nota (opcional)" rows={2} value={note} error={noteError} onChange={(e) => setNote(e.target.value)} />
        {serverError ? (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
