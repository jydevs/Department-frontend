"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onSessionLost, restoreSession, setAccessToken } from "./api-client";

export interface AuthUser { id: string; name: string; email: string; role: string; totpEnabled: boolean }
interface MeResponse { id: string; email: string; fullName: string; role: string; permissions: string[]; totpEnabled: boolean }
interface LoginResponse { accessToken: string; expiresIn: number }

type Status = "loading" | "anon" | "authed";
interface AuthCtx {
  user: AuthUser | null;
  permissions: string[];
  status: Status;
  /** Lanza ApiError (code `TWO_FACTOR_REQUIRED` cuando falta el código de 2FA). */
  login: (email: string, password: string, totp?: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, permissions: [], status: "loading", login: async () => undefined, logout: async () => undefined, reload: async () => undefined });

const toUser = (m: MeResponse): AuthUser => ({ id: m.id, name: m.fullName, email: m.email, role: m.role, totpEnabled: m.totpEnabled });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: AuthUser | null; permissions: string[]; status: Status }>({ user: null, permissions: [], status: "loading" });

  const loadMe = useCallback(async () => {
    const me = await api.get<MeResponse>("/auth/me");
    setState({ user: toUser(me), permissions: me.permissions, status: "authed" });
  }, []);

  useEffect(() => {
    let off = false;
    onSessionLost(() => setState({ user: null, permissions: [], status: "anon" }));
    (async () => {
      try {
        if (await restoreSession()) await loadMe();
        else if (!off) setState({ user: null, permissions: [], status: "anon" });
      } catch {
        if (!off) setState({ user: null, permissions: [], status: "anon" });
      }
    })();
    return () => { off = true; onSessionLost(null); };
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string, totp?: string) => {
    const r = await api.post<LoginResponse>("/auth/login", { email, password, ...(totp ? { totp } : {}) });
    setAccessToken(r.accessToken);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* la sesión local se limpia igual */ }
    setAccessToken(null);
    setState({ user: null, permissions: [], status: "anon" });
  }, []);

  const value = useMemo<AuthCtx>(() => ({ ...state, login, logout, reload: loadMe }), [state, login, logout, loadMe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
