export interface ApiErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: { path: string; message: string }[];
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: { path: string; message: string }[];
  requestId?: string;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.status = body.statusCode;
    this.code = body.code;
    this.details = body.details ?? [];
    this.requestId = body.requestId;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) if (!(d.path in out)) out[d.path] = d.message;
    return out;
  }
}

/** Mensaje legible para mostrar al usuario. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "No tienes permiso para realizar esta acción.";
    if (e.code === "CONCURRENT_UPDATE") return "Alguien más editó esto. Recarga para ver los cambios.";
    return e.message;
  }
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

/** Mensajes en español para los códigos de error de la cuenta de cliente (con la tienda se cae al texto genérico). */
const FRIENDLY: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  INVALID_PASSWORD: "La contraseña actual no es correcta.",
  INVALID_TOKEN: "El enlace no es válido o ya venció. Solicita uno nuevo.",
  ADDRESS_LIMIT: "Puedes guardar hasta 10 direcciones.",
  RATE_LIMITED: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  NETWORK_ERROR: "No se pudo conectar con el servidor. Revisa tu conexión.",
  NOT_FOUND: "No encontramos lo que buscas.",
  VALIDATION_ERROR: "Revisa los datos del formulario.",
  UNAUTHORIZED: "Tu sesión terminó. Inicia sesión de nuevo.",
  SERVICE_UNAVAILABLE: "Servicio no disponible por el momento. Inténtalo más tarde.",
};

export function friendlyError(e: unknown, fallback = "Ocurrió un error inesperado. Inténtalo de nuevo."): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return FRIENDLY.RATE_LIMITED;
    return FRIENDLY[e.code] ?? (e.status >= 500 ? "Error del servidor. Inténtalo más tarde." : fallback);
  }
  return fallback;
}
