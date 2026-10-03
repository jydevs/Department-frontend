/** Incidencia de validación (`details` de un `VALIDATION_ERROR`). */
export interface ApiErrorIssue {
  path: string;
  message: string;
  code?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  /** Según el código: lista de incidencias (validación) u objeto (`{ items }`, `{ reason }`, `{ variantIds }`…). */
  details?: unknown;
  requestId?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isIssue = (v: unknown): v is ApiErrorIssue => isRecord(v) && typeof v.path === "string" && typeof v.message === "string";

export class ApiError extends Error {
  status: number;
  code: string;
  /** `details` tal como lo envió la API (arreglo, objeto o ausente). Úsalo con `detailsObject()` / `issues`. */
  rawDetails: unknown;
  /** Incidencias de validación normalizadas: SIEMPRE un arreglo (vacío si `details` no es una lista de `{ path, message }`). */
  details: ApiErrorIssue[];
  requestId?: string;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.status = body.statusCode;
    this.code = body.code;
    this.rawDetails = body.details;
    this.details = Array.isArray(body.details) ? body.details.filter(isIssue) : [];
    this.requestId = body.requestId;
  }
  /** `details` cuando es un objeto (INSUFFICIENT_STOCK, DISCOUNT_INVALID…); `null` si no lo es. */
  detailsObject(): Record<string, unknown> | null {
    return isRecord(this.rawDetails) ? this.rawDetails : null;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) if (!(d.path in out)) out[d.path] = d.message;
    return out;
  }
  /** Fallo de conexión o servidor caído (no es culpa de los datos del usuario). */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}

/** `fetch` cancelado con `AbortController` (no es un error de red). */
export const isAbortError = (e: unknown): boolean => e instanceof DOMException && e.name === "AbortError";

/** Mensaje legible para mostrar al usuario (sin texto en inglés de la API salvo que no haya otra opción). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "No tienes permiso para realizar esta acción.";
    if (e.code === "CONCURRENT_UPDATE") return "Alguien más editó esto. Recarga para ver los cambios.";
    if (e.status === 0 || e.status >= 500 || e.status === 429) return friendlyError(e);
    return e.message;
  }
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

/** Motivos de `DISCOUNT_INVALID` (`details.reason`). */
const DISCOUNT_REASON: Record<string, string> = {
  not_found: "Ese código de descuento no existe.",
  inactive: "Ese código de descuento no está activo.",
  not_started: "Ese código de descuento todavía no está vigente.",
  expired: "Ese código de descuento ya venció.",
  usage_limit_reached: "Ese código de descuento ya alcanzó su límite de usos.",
  min_subtotal: "Tu compra no alcanza el mínimo para usar ese código.",
  already_used: "Ya usaste ese código de descuento con este correo.",
};
export const discountReasonMessage = (reason: unknown): string =>
  (typeof reason === "string" && DISCOUNT_REASON[reason]) || "Ese código de descuento no es válido.";

/** Mensajes en español por código de error de la API. */
const FRIENDLY: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  INVALID_PASSWORD: "La contraseña no es correcta.",
  INVALID_TOKEN: "El enlace no es válido o ya venció. Solicita uno nuevo.",
  ADDRESS_LIMIT: "Puedes guardar hasta 10 direcciones.",
  RATE_LIMITED: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  THROTTLED: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  NETWORK_ERROR: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  NOT_FOUND: "No encontramos lo que buscas.",
  VALIDATION_ERROR: "Revisa los datos del formulario.",
  BAD_REQUEST: "La solicitud no es válida. Revisa los datos e inténtalo de nuevo.",
  UNAUTHORIZED: "Tu sesión terminó. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  SERVICE_UNAVAILABLE: "Servicio no disponible por el momento. Inténtalo más tarde.",
  INTERNAL_ERROR: "Error del servidor. Inténtalo de nuevo en unos minutos.",
  CONFLICT: "No se pudo completar la acción por un conflicto con otro cambio. Inténtalo de nuevo.",
  CONCURRENT_UPDATE: "Hubo un cambio simultáneo. Inténtalo de nuevo.",
  PAYLOAD_TOO_LARGE: "Los datos enviados son demasiado grandes.",
  UNSUPPORTED_MEDIA_TYPE: "Formato de datos no admitido.",
  // carrito / checkout
  VARIANT_UNAVAILABLE: "Uno de los productos ya no está disponible. Quítalo del carrito para continuar.",
  CART_EXPIRED: "Tu carrito expiró. Vuelve a añadir tus productos.",
  CART_ALREADY_CONVERTED: "Este carrito ya se convirtió en un pedido. Revisa tu correo o empieza una compra nueva.",
  CART_CONVERTED: "Este carrito ya se convirtió en un pedido. Empieza una compra nueva.",
  CART_EMPTY: "Tu carrito está vacío.",
  CART_TOKEN_REQUIRED: "No pudimos identificar tu carrito. Recarga la página e inténtalo de nuevo.",
  MAX_LINE_QUANTITY: "Solo puedes comprar hasta 20 unidades de cada producto.",
  MAX_CART_LINES: "Tu carrito alcanzó el máximo de productos distintos (50).",
  INVALID_QUANTITY: "La cantidad no es válida.",
  QUANTITY_TOO_LARGE: "La cantidad es demasiado grande.",
  SHIPPING_RATE_INVALID: "Ese método de envío no está disponible para tu destino. Elige otro.",
  INVALID_TOTAL: "El total del pedido no es válido.",
  IDEMPOTENCY_IN_PROGRESS: "Tu pedido todavía se está procesando. Espera unos segundos e inténtalo de nuevo.",
  IDEMPOTENCY_KEY_REUSED: "Los datos cambiaron mientras se procesaba tu pedido. Revisa el formulario e inténtalo de nuevo.",
  IDEMPOTENCY_KEY_REQUIRED: "No se pudo identificar la solicitud. Recarga la página e inténtalo de nuevo.",
  ORDER_NOT_PAYABLE: "Este pedido ya no se puede pagar.",
  PAYMENT_FAILED: "El pago no se pudo procesar.",
  SERVICE_ERROR: "Error del servidor. Inténtalo de nuevo en unos minutos.",
};

/** Cantidad disponible que informa un `INSUFFICIENT_STOCK` (`{ available }` o `{ items: [{ available }] }`). */
function stockAvailable(e: ApiError): number | null {
  const d = e.detailsObject();
  if (!d) return null;
  if (typeof d.available === "number") return d.available;
  const items = Array.isArray(d.items) ? d.items.filter(isRecord) : [];
  if (items.length === 1 && typeof items[0].available === "number") return items[0].available;
  return null;
}
export const stockMessage = (available: number | null): string =>
  available === null
    ? "Algunos productos no tienen stock suficiente. Ajusta las cantidades de tu carrito."
    : available <= 0
      ? "Este producto se agotó."
      : `Solo ${available === 1 ? "queda 1 unidad" : `quedan ${available} unidades`} de este producto.`;

export function friendlyError(e: unknown, fallback = "Ocurrió un error inesperado. Inténtalo de nuevo."): string {
  if (!(e instanceof ApiError)) return fallback;
  if (e.code === "NETWORK_ERROR") return FRIENDLY.NETWORK_ERROR;
  if (e.status === 429 || e.code === "RATE_LIMITED" || e.code === "THROTTLED") return FRIENDLY.RATE_LIMITED;
  if (e.code === "INSUFFICIENT_STOCK") return stockMessage(stockAvailable(e));
  if (e.code === "DISCOUNT_INVALID") return discountReasonMessage(e.detailsObject()?.reason);
  if (e.code === "VARIANT_UNAVAILABLE" && e.status === 409) return FRIENDLY.VARIANT_UNAVAILABLE;
  const mapped = FRIENDLY[e.code];
  if (mapped) return mapped;
  if (e.status >= 500) return "Error del servidor. Inténtalo de nuevo en unos minutos.";
  if (e.status === 401) return FRIENDLY.UNAUTHORIZED;
  if (e.status === 403) return FRIENDLY.FORBIDDEN;
  if (e.status === 404) return FRIENDLY.NOT_FOUND;
  return fallback;
}
