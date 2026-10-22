import { BFF_BASE } from "./config";
import { errorMessage } from "./errors";
import type { BffError } from "./types";

export interface BffResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: BffError | null;
}

interface BffOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Calls the account BFF (`/api/account/*`). The browser never talks to the customers API: the session lives in
 * httpOnly cookies that the BFF reads. Never throws; a network failure becomes `{ ok: false, status: 0 }`.
 */
export async function bff<T = unknown>(path: string, options: BffOptions = {}): Promise<BffResult<T>> {
  const { method = "GET", body, signal } = options;
  try {
    const res = await fetch(`${BFF_BASE}${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    if (res.status === 204) return { ok: true, status: 204, data: null, error: null };
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    if (res.ok) return { ok: true, status: res.status, data: parsed as T, error: null };
    const err = (parsed ?? {}) as Partial<BffError>;
    const code = typeof err.code === "string" ? err.code : "UNKNOWN";
    return {
      ok: false,
      status: res.status,
      data: null,
      error: {
        code,
        message: typeof err.message === "string" ? err.message : errorMessage(code, res.status),
        fields: err.fields,
        retryAfter: err.retryAfter,
      },
    };
  } catch {
    if (signal?.aborted) return { ok: false, status: 0, data: null, error: { code: "ABORTED", message: "" } };
    return { ok: false, status: 0, data: null, error: { code: "SERVICE_UNAVAILABLE", message: errorMessage("SERVICE_UNAVAILABLE", 503) } };
  }
}

/** Field errors of an API validation failure, keeping the first message per field. */
export function fieldErrors(error: BffError | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!error?.fields) return out;
  for (const [key, messages] of Object.entries(error.fields)) if (messages[0]) out[key] = messages[0];
  return out;
}
