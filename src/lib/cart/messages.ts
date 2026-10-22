import { formatCOP } from "@/lib/format";
import type { ApiIssue } from "./types";

/**
 * Spanish copy for the API's business errors. The backend answers `{ code, message, details }`; branch on `code`
 * (the English `message` is for logs). Used by the BFF routes (server) and by the UI (client).
 */

const DISCOUNT_REASONS: Record<string, string> = {
  not_found: "Ese código de descuento no existe o no está vigente.",
  inactive: "Ese código de descuento no existe o no está vigente.",
  not_started: "Ese código de descuento todavía no está vigente.",
  expired: "Ese código de descuento ya venció.",
  usage_limit_reached: "Ese código de descuento ya alcanzó su límite de usos.",
  already_used: "Ya usaste este código de descuento con este correo.",
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Message for an API error. `status` 0 = the shop's API could not be reached. */
export function messageForError(
  code: string | null | undefined,
  status: number,
  details?: Record<string, unknown> | null,
): string {
  switch (code) {
    case "INSUFFICIENT_STOCK": {
      const available = asNumber(details?.available);
      if (available === 0) return "Este producto se agotó mientras comprabas.";
      if (available !== null) {
        return available === 1 ? "Solo queda 1 unidad disponible de este producto." : `Solo quedan ${available} unidades disponibles de este producto.`;
      }
      return "No hay suficiente inventario de este producto.";
    }
    case "VARIANT_UNAVAILABLE":
      return "Este producto ya no está disponible.";
    case "MAX_LINE_QUANTITY":
      return "Puedes llevar máximo 20 unidades de cada producto.";
    case "MAX_CART_LINES":
      return "Tu carrito alcanzó el máximo de productos distintos.";
    case "CART_CONVERTED":
    case "CART_ALREADY_CONVERTED":
      return "Este carrito ya se convirtió en un pedido. Empieza uno nuevo para seguir comprando.";
    case "CART_EXPIRED":
      return "Tu carrito expiró. Vuelve a añadir tus productos.";
    case "CART_EMPTY":
      return "Tu carrito está vacío.";
    case "CART_TOKEN_REQUIRED":
      return "No pudimos identificar tu carrito. Recarga la página e inténtalo de nuevo.";
    case "DISCOUNT_INVALID": {
      const reason = typeof details?.reason === "string" ? details.reason : "not_found";
      if (reason === "min_subtotal") {
        const min = asNumber(details?.minSubtotal);
        return min !== null ? `Este código requiere una compra mínima de ${formatCOP(min)}.` : "Tu compra no alcanza el mínimo para este código.";
      }
      return DISCOUNT_REASONS[reason] ?? DISCOUNT_REASONS.not_found;
    }
    case "SHIPPING_RATE_INVALID":
      return "El método de envío elegido ya no está disponible para ese destino. Elige otro.";
    case "ORDER_NOT_PAYABLE":
      return "Este pedido ya no se puede pagar.";
    case "IDEMPOTENCY_IN_PROGRESS":
      return "Tu pedido se está procesando. Espera unos segundos e inténtalo de nuevo.";
    case "IDEMPOTENCY_KEY_REUSED":
      return "No pudimos reintentar el pedido con los datos modificados. Inténtalo de nuevo.";
    case "INVALID_TOTAL":
      return "El total del pedido no es válido.";
    case "VALIDATION_ERROR":
      return "Revisa los datos marcados en el formulario.";
    case "RATE_LIMITED":
    case "THROTTLED":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "SERVICE_UNAVAILABLE":
      return "El pago no está disponible por ahora. Inténtalo más tarde.";
    case "FORBIDDEN_ORIGIN":
      return "No pudimos validar el origen de la solicitud. Recarga la página.";
    case "NOT_FOUND":
      return "No encontramos lo que buscabas.";
    default:
      break;
  }
  if (status === 0) return "No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.";
  if (status === 429) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (status >= 500) return "La tienda tuvo un problema. Inténtalo de nuevo en unos minutos.";
  return "No pudimos completar la acción. Inténtalo de nuevo.";
}

export function issueFrom(
  code: string | null | undefined,
  status: number,
  details?: Record<string, unknown> | null,
  fields?: Record<string, string>,
): ApiIssue {
  return {
    code: code ?? (status === 0 ? "NETWORK" : `HTTP_${status}`),
    message: messageForError(code, status, details),
    status,
    ...(fields && Object.keys(fields).length > 0 ? { fields } : null),
    ...(details ? { details } : null),
  };
}
