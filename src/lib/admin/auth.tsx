"use client";
import { createContext, useContext, type ReactNode } from "react";
import { ALL_PERMISSIONS } from "./mock/seed";

export interface AuthUser { id: string; name: string; email: string; role: string }
interface AuthCtx { user: AuthUser; permissions: string[]; status: "authed" }

/**
 * Fase visual: no hay inicio de sesión; el panel abre directamente con un usuario propietario simulado.
 * Al conectar la API real, reemplazar por `POST /auth/refresh` + `GET /auth/me` (y restaurar el login).
 */
const VALUE: AuthCtx = {
  user: { id: "stf_1", name: "Propietario Dept.", email: "owner@daregulardept.com", role: "owner" },
  permissions: ALL_PERMISSIONS,
  status: "authed",
};
const Ctx = createContext<AuthCtx>(VALUE);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={VALUE}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
