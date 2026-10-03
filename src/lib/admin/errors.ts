import { ApiError } from "@/lib/api/errors";

export { ApiError, type ApiErrorBody } from "@/lib/api/errors";

/** Etiquetas en español de los campos que la API suele rechazar (último segmento de `path`). */
const FIELDS: Record<string, string> = {
  name: "Nombre", fullName: "Nombre", firstName: "Nombre", lastName: "Apellido", email: "Correo", phone: "Teléfono", password: "Contraseña", current: "Contraseña actual", new: "Contraseña nueva",
  title: "Título", code: "Código", value: "Valor", type: "Tipo", usageLimit: "Límite de usos", minSubtotal: "Subtotal mínimo", startsAt: "Inicio", endsAt: "Fin",
  price: "Precio", freeOverSubtotal: "Gratis desde", minDays: "Días mínimos", maxDays: "Días máximos", departments: "Departamentos", ratePercent: "Tarifa", label: "Etiqueta",
  subject: "Asunto", bodyHtml: "HTML", bodyText: "Texto", roleId: "Rol", reason: "Motivo", note: "Nota", tags: "Etiquetas", amount: "Monto", carrier: "Transportadora",
  trackingNumber: "Número de guía", trackingUrl: "Enlace de rastreo", address1: "Dirección", address2: "Complemento", city: "Ciudad", department: "Departamento", postalCode: "Código postal",
  documentNumber: "Número de documento", internalNote: "Nota interna", version: "Versión", quantity: "Cantidad", lines: "Productos", to: "Destinatario", totp: "Código de verificación",
};
const fieldLabel = (path: string): string => {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return "";
  const last = parts[parts.length - 1];
  const label = FIELDS[last] ?? FIELDS[parts.findLast((p) => FIELDS[p]) ?? ""] ?? last;
  const idx = parts.find((p) => /^\d+$/.test(p));
  return idx !== undefined && parts.length > 2 ? `${label} (fila ${Number(idx) + 1})` : label;
};

/** Traduce los mensajes de validación (zod) del backend a español legible. */
function zodMessage(m: string): string {
  let r: RegExpExecArray | null;
  if ((r = /^Invalid input: expected (\w+), received undefined$/.exec(m))) return "es obligatorio";
  if ((r = /^Invalid input: expected int, received number$/.exec(m))) return "debe ser un número entero";
  if ((r = /^Invalid input: expected (\w+), received (\w+)$/.exec(m))) return r[1] === "number" ? "debe ser un número" : r[1] === "string" ? "debe ser texto" : r[1] === "boolean" ? "debe ser sí o no" : "tiene un formato no válido";
  if ((r = /^Too small: expected string to have >=(\d+) characters?$/.exec(m))) return Number(r[1]) <= 1 ? "es obligatorio" : `debe tener al menos ${r[1]} caracteres`;
  if ((r = /^Too big: expected string to have <=(\d+) characters?$/.exec(m))) return `no puede superar ${r[1]} caracteres`;
  if ((r = /^Too small: expected number to be >=(-?[\d.]+)$/.exec(m))) return `debe ser mayor o igual a ${r[1]}`;
  if ((r = /^Too small: expected number to be >(-?[\d.]+)$/.exec(m))) return `debe ser mayor que ${r[1]}`;
  if ((r = /^Too big: expected number to be <=(-?[\d.]+)$/.exec(m))) return `debe ser menor o igual a ${r[1]}`;
  if ((r = /^Too small: expected array to have >=(\d+) items?$/.exec(m))) return `debe tener al menos ${r[1]} elemento${r[1] === "1" ? "" : "s"}`;
  if ((r = /^Too big: expected array to have <=(\d+) items?$/.exec(m))) return `admite como máximo ${r[1]} elementos`;
  if (/^Invalid email/.test(m)) return "no es un correo válido";
  if (/^Invalid URL/.test(m)) return "no es un enlace válido";
  if (/^Invalid UUID/.test(m)) return "no es un identificador válido";
  if (/^Invalid ISO/.test(m)) return "no es una fecha válida";
  if (/^Invalid option/.test(m)) return "tiene un valor no permitido";
  if (/^Invalid string: must match pattern/.test(m)) return "tiene un formato no válido";
  if (/^Unrecognized key/.test(m)) return "incluye un campo no permitido";
  if (/^Invalid input/.test(m)) return "no es válido";
  return m;
}

/** Textos por código del backend (el servidor responde en inglés). */
const CODES: Record<string, string> = {
  CONCURRENT_UPDATE: "Alguien más editó esto al mismo tiempo. Recarga para ver los cambios e inténtalo de nuevo.",
  VERSION_REQUIRED: "Falta la versión del registro. Recarga la página.", VERSION_INVALID: "Los datos cambiaron. Recarga la página e inténtalo de nuevo.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.", INVALID_PASSWORD: "La contraseña actual no es correcta.", INVALID_OTP: "El código de verificación es incorrecto o venció.",
  INVALID_TOKEN: "El enlace no es válido o ya venció.", TWO_FACTOR_REQUIRED: "Ingresa el código de verificación de tu app.",
  STAFF_EXISTS: "Ya existe una persona del equipo con ese correo.", SKU_TAKEN: "Ya existe un producto con ese SKU.", HANDLE_TAKEN: "Ya existe un elemento con ese identificador (handle).",
  ZONE_EXISTS: "Ya existe una zona de envío con ese nombre.", DISCOUNT_INVALID: "El código de descuento no es válido.", DISCOUNT_IN_USE: "El descuento ya se usó y no se puede eliminar; desactívalo.",
  SHIPPING_RATE_INVALID: "La tarifa de envío no es válida.", ALREADY_ANONYMIZED: "El cliente ya fue anonimizado.", ORDER_NOT_EDITABLE: "Este pedido ya no se puede editar.",
  ORDER_NOT_PENDING: "El pedido ya no está pendiente de pago.", ORDER_NOT_PAYABLE: "El pedido no se puede marcar como pagado.", ORDER_NOT_PAID: "El pedido aún no está pagado.", ORDER_NOT_OPEN: "El pedido no está abierto.",
  ORDER_NOT_FULFILLABLE: "El pedido no se puede enviar en su estado actual.", ORDER_HAS_FULFILLMENTS: "El pedido ya tiene envíos y no se puede cancelar.", ORDER_NOT_REFUNDABLE: "El pedido no se puede reembolsar.",
  INVALID_ORDER_STATE: "El estado del pedido cambió. Se recargaron los datos.", REFUND_EXCEEDS_PAID: "El reembolso supera lo pagado.", REFUND_QUANTITY_INVALID: "Las unidades a reembolsar no son válidas.",
  RESTOCK_REQUIRES_LINES: "Para reponer stock indica las unidades devueltas.", FULFILLMENT_QUANTITY_INVALID: "Las unidades a enviar no son válidas.", FULFILLMENT_ALREADY_CANCELLED: "El envío ya estaba cancelado.",
  INVALID_TEMPLATE: "La plantilla de correo no es válida.", IMPORT_NOT_CANCELLABLE: "La importación ya no se puede cancelar.", IDEMPOTENCY_IN_PROGRESS: "La operación ya está en curso. Espera unos segundos.",
  NO_CHANGE: "No hay cambios para guardar.", MEDIA_IN_USE: "El archivo está en uso y no se puede eliminar.", LAST_ACTIVE_VARIANT: "No puedes eliminar la última variante activa.",
  INSUFFICIENT_STOCK: "No hay stock suficiente.", INVALID_CURSOR: "La paginación venció. Recarga la lista.", PAYLOAD_TOO_LARGE: "El archivo o los datos enviados son demasiado grandes.", UNSUPPORTED_MEDIA_TYPE: "Formato de archivo no admitido.",
  NOTHING_TO_PUBLISH: "No hay cambios por publicar.", NOT_PUBLISHED: "Aún no se ha publicado.",
};

/** Mensaje legible, en español, para mostrar al usuario (nunca texto crudo del servidor en inglés). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "NETWORK_ERROR" || e.status === 0) return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
    if (e.status === 429) return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
    if (e.status === 401) return CODES[e.code] ?? "Tu sesión terminó. Inicia sesión de nuevo.";
    if (e.status === 403) return "No tienes permiso para realizar esta acción.";
    if (e.status === 404) return "No encontramos lo que buscas. Puede haber sido eliminado.";
    if (e.status >= 500) return "Error del servidor. Inténtalo de nuevo en unos minutos.";
    if (e.code === "VALIDATION_ERROR") {
      const seen = new Set<string>();
      const lines = e.details.map((d) => {
        const f = fieldLabel(d.path), m = zodMessage(d.message);
        return `${f ? `${f} ` : ""}${m}`.replace(/^./, (c) => c.toUpperCase());
      }).filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
      return lines.length ? `Revisa los datos: ${lines.join("; ")}.` : "Revisa los datos del formulario.";
    }
    if (CODES[e.code]) return CODES[e.code];
    if (e.status === 409 || e.status === 412) return "La acción choca con el estado actual de los datos. Recarga la página e inténtalo de nuevo.";
    if (e.status === 422) return "Los datos enviados no se pueden procesar. Revísalos e inténtalo de nuevo.";
    if (e.status === 400) return "Solicitud no válida. Revisa los datos e inténtalo de nuevo.";
    return "No se pudo completar la acción. Inténtalo de nuevo.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "Ocurrió un error inesperado.";
}

/** Códigos de campo → mensaje (`fieldErrors`) ya traducidos, para formularios. */
export function fieldMessages(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {};
  const out: Record<string, string> = {};
  for (const d of e.details) if (!(d.path in out)) out[d.path] = zodMessage(d.message);
  return out;
}
