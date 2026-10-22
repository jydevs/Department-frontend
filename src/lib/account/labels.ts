/** Spanish labels for the order states the API reports. Unknown values are shown as they come. */
export const ORDER_STATUS: Record<string, string> = {
  pending: "Pendiente de pago",
  open: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
  expired: "Vencido",
};

export const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pago pendiente",
  paid: "Pagado",
  failed: "Pago fallido",
  partially_refunded: "Reembolso parcial",
  refunded: "Reembolsado",
};

export const FULFILLMENT_STATUS: Record<string, string> = {
  unfulfilled: "Sin enviar",
  partial: "Envío parcial",
  fulfilled: "Enviado",
};

export const label = (map: Record<string, string>, key: string): string => map[key] ?? key;

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : null),
    timeZone: "America/Bogota",
  }).format(d);
}

/** Only http(s) links are rendered as links (a carrier URL comes from staff input). */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
