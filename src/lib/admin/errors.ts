/** Cuerpo de error uniforme de la API. */
export interface ApiErrorBody {
  statusCode: number;
  error?: string;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

function isIssue(v: unknown): v is ValidationIssue {
  return typeof v === "object" && v !== null && typeof (v as ValidationIssue).path === "string" && typeof (v as ValidationIssue).message === "string";
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | undefined;
  /** Segundos sugeridos por `Retry-After` (429). */
  readonly retryAfter: number | undefined;

  constructor(init: { status: number; code: string; message: string; details?: unknown; requestId?: string; retryAfter?: number }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
    this.retryAfter = init.retryAfter;
  }

  /** Errores por campo (clave = `path` separado por puntos) de un VALIDATION_ERROR. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const item of this.details) {
        if (isIssue(item) && !(item.path in out)) out[item.path] = item.message;
      }
    }
    return out;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  NOT_FOUND: "No se encontró lo que buscas. Puede que ya no exista.",
  CONCURRENT_UPDATE: "Alguien más editó esto mientras trabajabas. Recarga para ver los cambios más recientes.",
  VERSION_REQUIRED: "Falta la versión del documento. Recarga e inténtalo de nuevo.",
  RATE_LIMITED: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  PAYLOAD_TOO_LARGE: "El archivo o los datos son demasiado grandes.",
  UNSUPPORTED_MEDIA_TYPE: "Tipo de archivo no admitido.",
  VALIDATION_ERROR: "Revisa los campos marcados.",
  CONFLICT: "La operación entra en conflicto con el estado actual.",
  NETWORK_ERROR: "No se pudo conectar con el servidor. Revisa tu conexión.",
  SERVICE_UNAVAILABLE: "El servicio no está disponible por ahora. Inténtalo en unos minutos.",
  INTERNAL_ERROR: "Ocurrió un error inesperado. Inténtalo de nuevo.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
};

/** Mensaje legible en español para cualquier error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const mapped = CODE_MESSAGES[e.code];
    if (e.code === "VALIDATION_ERROR") {
      const first = Object.values(e.fieldErrors())[0];
      return first ? `${CODE_MESSAGES.VALIDATION_ERROR} (${first})` : CODE_MESSAGES.VALIDATION_ERROR;
    }
    if (mapped) return mapped;
    if (e.status >= 500) return CODE_MESSAGES.INTERNAL_ERROR;
    return e.message || "Ocurrió un error.";
  }
  if (e instanceof Error) return e.message;
  return "Ocurrió un error inesperado.";
}

export function isConcurrentUpdate(e: unknown): boolean {
  return e instanceof ApiError && e.status === 409 && (e.code === "CONCURRENT_UPDATE" || e.code === "VERSION_CONFLICT");
}

export function isForbidden(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403;
}
