"use client";

import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { api } from "@/lib/admin/api-client";
import type { ApiError } from "@/lib/admin/errors";
import type { CursorPage } from "@/lib/admin/query";

export interface AuditLog {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: unknown;
  requestId: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditFilters {
  entityType: string;
  actorId: string;
}

export function useAuditLogs(filters: AuditFilters, limit = 25) {
  return useInfiniteQuery<CursorPage<AuditLog>, ApiError, InfiniteData<CursorPage<AuditLog>, string | null>, unknown[], string | null>({
    queryKey: ["audit", filters, limit],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      api.get<CursorPage<AuditLog>>("/admin/audit-logs", {
        signal,
        query: { limit, cursor: pageParam, entityType: filters.entityType.trim() || undefined, actorId: filters.actorId.trim() || undefined },
      }),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });
}

export interface DiffRow {
  field: string;
  before: unknown;
  after: unknown;
  /** true si solo hay un valor (no es old→new). */
  single: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Convierte el `diff` libre del servidor en filas claro old→new. */
export function diffRows(diff: unknown): DiffRow[] {
  if (diff === null || diff === undefined) return [];
  if (!isObj(diff)) return [{ field: "valor", before: undefined, after: diff, single: true }];
  const rows: DiffRow[] = [];
  // forma { before: {...}, after: {...} }
  if (isObj(diff.before) && isObj(diff.after)) {
    const keys = new Set([...Object.keys(diff.before), ...Object.keys(diff.after)]);
    for (const k of keys) {
      if (!same(diff.before[k], diff.after[k])) rows.push({ field: k, before: diff.before[k], after: diff.after[k], single: false });
    }
    for (const [k, v] of Object.entries(diff)) if (k !== "before" && k !== "after") rows.push({ field: k, before: undefined, after: v, single: true });
    return rows;
  }
  for (const [k, v] of Object.entries(diff)) {
    if (isObj(v) && "old" in v && "new" in v) rows.push({ field: k, before: v.old, after: v.new, single: false });
    else if (isObj(v) && "before" in v && "after" in v) rows.push({ field: k, before: v.before, after: v.after, single: false });
    else rows.push({ field: k, before: undefined, after: v, single: true });
  }
  return rows;
}
