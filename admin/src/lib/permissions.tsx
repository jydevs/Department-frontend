"use client";
import type { ReactNode } from "react";
import { useAuth } from "./auth";

export function useCan(...perms: string[]): boolean {
  const { permissions } = useAuth();
  return perms.every((p) => permissions.includes(p));
}
export function Can({ perm, children, fallback = null }: { perm: string | string[]; children: ReactNode; fallback?: ReactNode }) {
  const ok = useCan(...(Array.isArray(perm) ? perm : [perm]));
  return <>{ok ? children : fallback}</>;
}
