"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/admin/ui";
import { ApiError, errorMessage } from "@/lib/admin/errors";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError | Error;
}

/**
 * Ejecuta una operación asíncrona con estado `pending`, captura el error, avisa con un toast y devuelve el resultado.
 * `silentError` evita el toast cuando el llamador quiere tratar el error (p. ej. mostrarlo en un diálogo).
 */
export function useAction() {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const count = useRef(0);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts: { success?: string; silentError?: boolean } = {}): Promise<ActionResult<T>> => {
      count.current += 1;
      setPending(true);
      try {
        const data = await fn();
        if (opts.success) toast.success(opts.success);
        return { ok: true, data };
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (!opts.silentError) toast.error(errorMessage(error));
        return { ok: false, error: error as ApiError };
      } finally {
        count.current -= 1;
        if (count.current === 0) setPending(false);
      }
    },
    [toast],
  );

  return { run, pending };
}
