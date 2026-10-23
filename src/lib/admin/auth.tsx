"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, refreshSession, setAccessToken, setSecurityGateHandler, setUnauthorizedHandler } from "@/lib/admin/api-client";

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  totpEnabled: boolean;
  /** Contraseña temporal: el backend solo deja cambiarla hasta que lo haga. */
  mustChangePassword?: boolean;
  /** Owner/admin sin 2FA con REQUIRE_STAFF_2FA: solo deja activar la verificación en dos pasos. */
  twoFactorSetupRequired?: boolean;
}

export type AuthStatus = "loading" | "authed" | "anon";

export interface AuthContextValue {
  user: StaffUser | null;
  permissions: string[];
  status: AuthStatus;
  /** true tras un cierre de sesión explícito (el AuthGate va a /login sin `?next=`). */
  loggedOut: boolean;
  /** Lanza ApiError; `code === "TWO_FACTOR_REQUIRED"` indica que hay que pedir `totp` (6 dígitos o recovery code). */
  login: (email: string, password: string, totp?: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  /** Vuelve a leer GET /auth/me (p. ej. tras activar 2FA). */
  reloadUser: () => Promise<void>;
}

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [loggedOut, setLoggedOut] = useState(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("anon");
    queryClient.clear();
  }, [queryClient]);

  // arranque: refresh (cookie httpOnly) + me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshSession();
      if (cancelled) return;
      if (!token) {
        setStatus("anon");
        return;
      }
      try {
        const me = await api.get<StaffUser>("/auth/me");
        if (cancelled) return;
        setUser(me);
        setStatus("authed");
      } catch {
        if (!cancelled) setStatus("anon");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // sesión irrecuperable (refresh falló tras un 401)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("anon");
      queryClient.clear();
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  // 403 PASSWORD_CHANGE_REQUIRED / TWO_FACTOR_SETUP_REQUIRED: el estado de seguridad cambió; releer /auth/me
  useEffect(() => {
    let inFlight = false;
    setSecurityGateHandler(() => {
      if (inFlight) return;
      inFlight = true;
      api
        .get<StaffUser>("/auth/me")
        .then((me) => setUser(me))
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    });
    return () => setSecurityGateHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string, totp?: string) => {
    const body: { email: string; password: string; totp?: string } = { email: email.trim(), password };
    if (totp) body.totp = totp.trim().toUpperCase();
    const res = await api.post<LoginResponse>("/auth/login", body);
    setAccessToken(res.accessToken, res.expiresIn);
    const me = await api.get<StaffUser>("/auth/me");
    setUser(me);
    setStatus("authed");
    setLoggedOut(false);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* aunque falle, cerramos la sesión local */
    }
    setLoggedOut(true);
    clearSession();
  }, [clearSession]);

  const reloadUser = useCallback(async () => {
    const me = await api.get<StaffUser>("/auth/me");
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, permissions: user?.permissions ?? [], status, loggedOut, login, logout, reloadUser }),
    [user, status, loggedOut, login, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
