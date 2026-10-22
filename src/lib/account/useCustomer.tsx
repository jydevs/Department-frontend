"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bff, type BffResult } from "./client";
import type { CustomerProfile } from "./types";

export type CustomerStatus = "loading" | "authenticated" | "anonymous";

interface CustomerContextValue {
  status: CustomerStatus;
  customer: CustomerProfile | null;
  /** Calls the BFF; a 401 (session over) flips the state to anonymous so every guard reacts at once. */
  request: <T = unknown>(path: string, options?: Parameters<typeof bff>[1]) => Promise<BffResult<T>>;
  login: (email: string, password: string) => Promise<BffResult<{ customer: CustomerProfile }>>;
  logout: () => Promise<void>;
  /** Updates the cached profile (after editing it). */
  setCustomer: (customer: CustomerProfile) => void;
  /** Drops the local session state without calling the API (cookies were already cleared by the BFF). */
  endSession: () => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

const CHANNEL = "dept-account";
const REVALIDATE_AFTER_MS = 60_000;

/**
 * Session state of the visitor. `hasSession` is computed on the server (the httpOnly cookies exist): without cookies
 * no request is made and the UI is anonymous from the first paint; with cookies the state is "loading" until
 * `/api/account/me` answers, so the header never flashes the wrong buttons. Tokens never reach this code.
 */
export function CustomerProvider({ hasSession, children }: { hasSession: boolean; children: ReactNode }) {
  const [status, setStatus] = useState<CustomerStatus>(hasSession ? "loading" : "anonymous");
  const [customer, setCustomerState] = useState<CustomerProfile | null>(null);
  const lastCheck = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);

  const apply = useCallback((profile: CustomerProfile | null) => {
    setCustomerState(profile);
    setStatus(profile ? "authenticated" : "anonymous");
  }, []);

  const probe = useCallback(async () => {
    const res = await bff<{ customer: CustomerProfile | null }>("/me");
    lastCheck.current = Date.now();
    // a network failure keeps whatever state we had: an outage must not log anybody out visually
    if (res.ok) apply(res.data?.customer ?? null);
    else if (res.status !== 0 && res.status !== 503) apply(null);
    else setStatus((s) => (s === "loading" ? "anonymous" : s));
  }, [apply]);

  useEffect(() => {
    if (hasSession) void Promise.resolve().then(probe);
  }, [hasSession, probe]);

  // other tabs: login / logout there is reflected here; coming back to the tab re-validates the session
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = () => void probe();
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [probe]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && status === "authenticated" && Date.now() - lastCheck.current > REVALIDATE_AFTER_MS) void probe();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [probe, status]);

  const request = useCallback(
    async <T,>(path: string, options?: Parameters<typeof bff>[1]): Promise<BffResult<T>> => {
      const res = await bff<T>(path, options);
      if (res.status === 401) apply(null);
      return res;
    },
    [apply],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await bff<{ customer: CustomerProfile }>("/login", { method: "POST", body: { email, password } });
      if (res.ok && res.data?.customer) {
        apply(res.data.customer);
        lastCheck.current = Date.now();
        channel.current?.postMessage("login");
      }
      return res;
    },
    [apply],
  );

  const logout = useCallback(async () => {
    await bff("/logout", { method: "POST" });
    apply(null);
    channel.current?.postMessage("logout");
  }, [apply]);

  const setCustomer = useCallback((profile: CustomerProfile) => apply(profile), [apply]);
  const endSession = useCallback(() => {
    apply(null);
    channel.current?.postMessage("logout");
  }, [apply]);

  const value = useMemo(
    () => ({ status, customer, request, login, logout, setCustomer, endSession }),
    [status, customer, request, login, logout, setCustomer, endSession],
  );
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer debe usarse dentro de <CustomerProvider>");
  return ctx;
}
