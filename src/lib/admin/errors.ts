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
