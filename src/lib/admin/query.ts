"use client";
import { QueryClient, keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./api-client";
import { ApiError } from "./errors";
import { useToast } from "@/components/admin/ui/Toast";
import { errorMessage } from "./errors";

export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (n, e) => !(e instanceof ApiError) && n < 2 },
    },
  });

type Q = Record<string, string | number | boolean | undefined | null>;
/** GET contra la API real. `path = null` desactiva la consulta. `select` adapta el DTO al modelo de la pantalla. */
export function useApi<D, R = D>(key: QueryKey, path: string | null, opts: { query?: Q; select?: (d: D) => R; enabled?: boolean; staleTime?: number; refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: [...key, opts.query ?? null],
    queryFn: () => api.get<D>(path as string, { query: opts.query }),
    select: opts.select,
    enabled: (opts.enabled ?? true) && path !== null,
    staleTime: opts.staleTime,
    refetchInterval: opts.refetchInterval,
    placeholderData: keepPreviousData,
  });
}

/** Mutación con toast de éxito/error e invalidación de claves. */
export function useAction<V, R = unknown>(fn: (v: V) => R | Promise<R>, opts: { invalidate?: QueryKey[]; success?: string; onSuccess?: (r: R) => void; /** El llamador muestra el error en su propio diálogo/formulario: no se repite como aviso emergente. */ inline?: boolean } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (v: V) => fn(v),
    onSuccess: async (r) => {
      for (const k of opts.invalidate ?? []) await qc.invalidateQueries({ queryKey: k });
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.(r as R);
    },
    onError: (e) => { if (!opts.inline) toast.error(errorMessage(e)); },
  });
}
