"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { ApiError, errorMessage } from "@/lib/admin/errors";
import { formatCop } from "@/lib/admin/format";

/** Aviso en línea (info / advertencia / peligro). */
export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "danger"; title?: string; children?: ReactNode; className?: string }) {
  const toneClass = {
    info: "border-info/40 bg-info/10",
    warning: "border-warning/40 bg-warning/10",
    danger: "border-danger/40 bg-danger/10",
  }[tone];
  const iconClass = { info: "text-info", warning: "text-warning", danger: "text-danger" }[tone];
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-sm", toneClass, className)}>
      <Icon aria-hidden size={18} className={cn("mt-0.5 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn("text-muted", title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Errores por campo de un VALIDATION_ERROR (vacío para otros errores). */
export function fieldErrorsOf(e: unknown): Record<string, string> {
  return e instanceof ApiError && e.code === "VALIDATION_ERROR" ? e.fieldErrors() : {};
}

const SHIPPING_MESSAGES: Record<string, string> = {
  ZONE_EXISTS: "Ya existe una zona con ese nombre. Elige otro nombre.",
  NOT_FOUND: "La zona o la tarifa ya no existe. Recarga la página.",
  CONFLICT: "No se pudo completar: el elemento está en uso o cambió. Recarga e inténtalo de nuevo.",
};

/** Mensaje legible en español, con los códigos propios del módulo de envíos. */
export function shippingError(e: unknown): string {
  if (e instanceof ApiError && SHIPPING_MESSAGES[e.code]) return SHIPPING_MESSAGES[e.code];
  return errorMessage(e);
}

/** Mensaje general: para VALIDATION_ERROR con errores por campo devuelve null (se muestran junto al campo). */
export function formErrorOf(e: unknown): string | null {
  if (e instanceof ApiError && e.code === "VALIDATION_ERROR" && Object.keys(e.fieldErrors()).length > 0) return null;
  return shippingError(e);
}

/** Misma normalización que el servidor (sin tildes, minúsculas, espacios simples). */
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function daysLabel(minDays: number | null, maxDays: number | null): string | null {
  if (minDays === null && maxDays === null) return null;
  if (minDays !== null && maxDays !== null) return minDays === maxDays ? `${minDays} ${minDays === 1 ? "día" : "días"}` : `${minDays}–${maxDays} días`;
  return minDays !== null ? `desde ${minDays} ${minDays === 1 ? "día" : "días"}` : `hasta ${maxDays} días`;
}

/** Cómo lo verá el comprador: «Envío nacional · $15.000 · 3–7 días · gratis desde $350.000». */
export function ratePreview(r: { name: string; price: number | null; freeOverSubtotal: number | null; minDays: number | null; maxDays: number | null }): string {
  const parts = [r.name.trim() || "Nombre de la tarifa", r.price === null ? "$0" : r.price === 0 ? "Gratis" : formatCop(r.price)];
  const d = daysLabel(r.minDays, r.maxDays);
  if (d) parts.push(d);
  if (r.freeOverSubtotal !== null) parts.push(`gratis desde ${formatCop(r.freeOverSubtotal)}`);
  return parts.join(" · ");
}
