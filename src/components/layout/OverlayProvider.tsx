"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccountModal } from "./AccountModal";
import { CartDrawer } from "./CartDrawer";

type Overlay = "account" | "cart" | null;

interface OverlayContextValue {
  openAccount: () => void;
  openCart: () => void;
  close: () => void;
  current: Overlay;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

/**
 * Holds which global overlay (account panel / cart drawer) is open and renders
 * both. The header icons call `openAccount` / `openCart`; anything under the
 * provider can read the context via `useOverlay()`.
 */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Overlay>(null);

  const close = useCallback(() => setCurrent(null), []);
  const openAccount = useCallback(() => setCurrent("account"), []);
  const openCart = useCallback(() => setCurrent("cart"), []);

  // lock body scroll while an overlay is open
  useEffect(() => {
    if (!current) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [current]);

  const value = useMemo(
    () => ({ openAccount, openCart, close, current }),
    [openAccount, openCart, close, current],
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <AccountModal open={current === "account"} onClose={close} />
      <CartDrawer open={current === "cart"} onClose={close} />
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error("useOverlay debe usarse dentro de <OverlayProvider>");
  }
  return ctx;
}
