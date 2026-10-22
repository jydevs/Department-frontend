import type { BffError } from "./types";

/** Spanish copy for the error codes the account BFF can answer. Unknown codes fall back to the HTTP status. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "El correo o la contraseña no son correctos.",
  INVALID_TOKEN: "El enlace no es válido, ya fue usado o venció.",
  INVALID_PASSWORD: "La contraseña actual no es correcta.",
  VALIDATION_ERROR: "Revisa los datos e inténtalo de nuevo.",
  ADDRESS_LIMIT: "Ya tienes 10 direcciones guardadas. Elimina una para agregar otra.",
  NOT_FOUND: "No encontramos lo que buscas.",
  RATE_LIMITED: "Demasiados intentos.",
  UNAUTHORIZED: "Tu sesión terminó. Inicia sesión de nuevo.",
  SESSION_EXPIRED: "Tu sesión terminó. Inicia sesión de nuevo.",
  SERVICE_UNAVAILABLE: "No pudimos conectar con la tienda. Inténtalo de nuevo en unos minutos.",
  CSRF_CONTENT_TYPE: "No pudimos validar la solicitud. Recarga la página e inténtalo de nuevo.",
  CSRF_ORIGIN: "No pudimos validar la solicitud. Recarga la página e inténtalo de nuevo.",
  BAD_REQUEST: "La solicitud no es válida.",
  PAYLOAD_TOO_LARGE: "La solicitud es demasiado grande.",
};

const BY_STATUS: Record<number, string> = {
  400: "La solicitud no es válida.",
  401: "Tu sesión terminó. Inicia sesión de nuevo.",
  403: "No tienes permiso para hacer esto.",
  404: "No encontramos lo que buscas.",
  409: "Hubo un conflicto con los datos actuales. Recarga e inténtalo de nuevo.",
  429: "Demasiados intentos.",
};

export function errorMessage(code: string, status: number): string {
  return MESSAGES[code] ?? BY_STATUS[status] ?? "Algo salió mal. Inténtalo de nuevo.";
}

/** "Espera 1 min 5 s" style hint for a 429. */
export function retryHint(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return " Espera un momento e inténtalo de nuevo.";
  if (seconds < 60) return ` Inténtalo de nuevo en ${seconds} s.`;
  return ` Inténtalo de nuevo en ${Math.ceil(seconds / 60)} min.`;
}

export function describeError(error: BffError | null, status: number): string {
  if (!error) return errorMessage("", status);
  const base = error.code === "RATE_LIMITED" || status === 429 ? errorMessage("RATE_LIMITED", 429) + retryHint(error.retryAfter) : error.message;
  return base;
}
