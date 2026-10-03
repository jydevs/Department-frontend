"use client";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError } from "./errors";
import { api, onSessionLost, restoreSession, setAccessToken } from "./api-client";

export interface AuthUser { id: string; name: string; email: string; role: string; totpEnabled: boolean }
interface MeResponse { id: string; email: string; fullName: string; role: string; permissions: string[]; totpEnabled: boolean }
interface LoginResponse { accessToken: string; expiresIn: number }

type Status = "loading" | "anon" | "authed";
/** Por qué no hay sesión: cierre voluntario (no se arrastra `?next=`), sesión vencida o aún sin iniciar. */
type Reason = "logout" | "expired" | null;
interface AuthCtx {
  user: AuthUser | null;
  permissions: string[];
  status: Status;
  reason: Reason;
  /** Lanza ApiError (code `TWO_FACTOR_REQUIRED` cuando falta el código de 2FA). */
  login: (email: string, password: string, totp?: string) => Promise<void>;
  /**
   * Revoca la sesión en el servidor (con refresco y reintento si el token venció). Devuelve `false`, sin cerrar la sesión local,
   * si no se pudo revocar (red/servidor): así la cookie de refresco no queda viva con la pantalla "cerrada".
   */
  logout: () => Promise<boolean>;
  /** Cierra solo la sesión local (el servidor ya la revocó, p. ej. tras cambiar la contraseña). */
  endSession: () => void;
  reload: () => Promise<void>;
}

const NONE = { user: null, permissions: [] as string[] };
const Ctx = createContext<AuthCtx>({ ...NONE, status: "loading", reason: null, login: async () => undefined, logout: async () => false, endSession: () => undefined, reload: async () => undefined });

const toUser = (m: MeResponse): AuthUser => ({ id: m.id, name: m.fullName, email: m.email, role: m.role, totpEnabled: m.totpEnabled });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<{ user: AuthUser | null; permissions: string[]; status: Status; reason: Reason }>({ ...NONE, status: "loading", reason: null });
  const loggingOut = useRef(false);

  const loadMe = useCallback(async () => {
    const me = await api.get<MeResponse>("/auth/me");
    setState({ user: toUser(me), permissions: me.permissions, status: "authed", reason: null });
  }, []);

  // Sin sesión no debe quedar nada de la persona anterior en memoria (la caché de consultas incluye datos de personal, auditoría…).
  useEffect(() => {
    if (state.status === "anon") qc.clear();
  }, [state.status, qc]);

  useEffect(() => {
    let off = false;
    onSessionLost(() => setState({ ...NONE, status: "anon", reason: "expired" }));
    (async () => {
      try {
        if (await restoreSession()) await loadMe();
        else if (!off) setState({ ...NONE, status: "anon", reason: null });
      } catch {
        if (!off) setState({ ...NONE, status: "anon", reason: null });
      }
    })();
    return () => { off = true; onSessionLost(null); };
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string, totp?: string) => {
    qc.clear();
    const r = await api.post<LoginResponse>("/auth/login", { email, password, ...(totp ? { totp } : {}) });
    setAccessToken(r.accessToken);
    await loadMe();
  }, [loadMe, qc]);

  const endSession = useCallback(() => {
    setAccessToken(null);
    setState({ ...NONE, status: "anon", reason: "logout" });
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    if (loggingOut.current) return false;
    loggingOut.current = true;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await api.post("/auth/logout"); // api-client ya renueva el token y reintenta si venció
          endSession();
          return true;
        } catch (e) {
          // 401 tras un refresco rechazado: la sesión ya no existe en el servidor (api-client avisó con sessionLost)
          if (e instanceof ApiError && e.status === 401) { endSession(); return true; }
          if (attempt === 0) await wait(600);
        }
      }
      return false;
    } finally {
      loggingOut.current = false;
    }
  }, [endSession]);

  const value = useMemo<AuthCtx>(() => ({ ...state, login, logout, endSession, reload: loadMe }), [state, login, logout, endSession, loadMe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
