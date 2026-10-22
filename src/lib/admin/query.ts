"use client";

import { QueryClient, keepPreviousData, useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import { api, type QueryParams } from "@/lib/admin/api-client";
import { ApiError } from "@/lib/admin/errors";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // reintenta solo errores de red (status 0), una vez
        retry: (failureCount, error) => error instanceof ApiError && error.status === 0 && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type PagedParams = QueryParams & { page?: number; pageSize?: number };

/** Lista con paginación offset. `key` es la clave base (p. ej. ["orders"]); los params se añaden a la clave. */
export function usePaged<T>(
  key: QueryKey,
  path: string,
  params: PagedParams = {},
  options: { enabled?: boolean } = {},
): UseQueryResult<Paged<T>, ApiError> {
  return useQuery<Paged<T>, ApiError>({
    queryKey: [...key, "paged", path, params],
    queryFn: ({ signal }) => api.get<Paged<T>>(path, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export type CursorParams = QueryParams & { limit?: number; cursor?: string | null };

/** Lista con paginación por cursor: una página a la vez (pasa `cursor` = nextCursor de la anterior). */
export function useCursorList<T>(
  key: QueryKey,
  path: string,
  params: CursorParams = {},
  options: { enabled?: boolean } = {},
): UseQueryResult<CursorPage<T>, ApiError> {
  return useQuery<CursorPage<T>, ApiError>({
    queryKey: [...key, "cursor", path, params],
    queryFn: ({ signal }) => api.get<CursorPage<T>>(path, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}
