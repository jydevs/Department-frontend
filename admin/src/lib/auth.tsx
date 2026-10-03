"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ALL_PERMISSIONS } from "./mock/seed";

export interface AuthUser { id: string; name: string; email: string; role: string }
interface AuthCtx {
  user: AuthUser | null; permissions: string[]; status: "loading" | "authed" | "anon";
  login: (email: string, password: string, totp?: string) => Promise<void>; logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

/**
 * Sesión SIMULADA para la fase visual. La sesión vive solo en memoria de la
 * pestaña (sessionStorage solo guarda un marcador booleano de demo, nunca un token).
 */
const FLAG = "dept-admin-demo-session";
const DEMO_USER: AuthUser = { id: "stf_1", name: "Propietario Dept.", email: "owner@daregulardept.com", role: "owner" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthCtx["status"]>("loading");
  useEffect(() => {
    let on = false;
    try { on = sessionStorage.getItem(FLAG) === "1"; } catch { /* sin almacenamiento */ }
    const t = setTimeout(() => setStatus(on ? "authed" : "anon"), 0);
    return () => clearTimeout(t);
  }, []);
  const login = useCallback(async (email: string, password: string, totp?: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (!email.includes("@") || password.length < 4) throw new Error("Credenciales inválidas. Usa cualquier correo y una contraseña de 4+ caracteres (demo).");
    void totp;
    try { sessionStorage.setItem(FLAG, "1"); } catch { /* ignorar */ }
    setStatus("authed");
  }, []);
  const logout = useCallback(async () => {
    try { sessionStorage.removeItem(FLAG); } catch { /* ignorar */ }
    setStatus("anon");
  }, []);
  const value = useMemo<AuthCtx>(() => ({ user: status === "authed" ? DEMO_USER : null, permissions: status === "authed" ? ALL_PERMISSIONS : [], status, login, logout }), [status, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}
