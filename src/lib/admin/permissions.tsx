"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/admin/auth";

export function hasPermissions(granted: readonly string[], required: readonly string[]): boolean {
  if (required.length === 0) return true;
  if (granted.includes("*")) return true;
  return required.every((p) => granted.includes(p));
}

/** true si el usuario tiene TODOS los permisos indicados. */
export function useCan(...perms: string[]): boolean {
  const { permissions } = useAuth();
  return hasPermissions(permissions, perms);
}

interface CanProps {
  /** Un permiso o varios (se exigen todos). */
  perm: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renderiza `children` solo si hay permiso; si no, `fallback` (nada por defecto). */
export function Can({ perm, children, fallback = null }: CanProps) {
  const { permissions } = useAuth();
  const list = Array.isArray(perm) ? perm : [perm];
  return <>{hasPermissions(permissions, list) ? children : fallback}</>;
}
