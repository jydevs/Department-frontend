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
import type { Product } from "@/lib/catalog/types";
import type { SearchConfig } from "@/components/search/config";
import { AccountModal } from "./AccountModal";
import { CartDrawer } from "./CartDrawer";
import type { CartConfig } from "./config";
import { SearchOverlay } from "./SearchOverlay";

type Overlay = "account" | "cart" | "search" | null;

interface OverlayContextValue {
  openAccount: () => void;
  openCart: () => void;
  openSearch: () => void;
  close: () => void;
  current: Overlay;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

interface OverlayProviderProps {
  children: ReactNode;
  /** `search-panel` section of template/search (texts + suggestions) */
  searchConfig?: SearchConfig;
  /** products listed under "Más buscado" */
  popularProducts?: Product[];
  /** `cart-drawer` section of template/cart */
  cartConfig?: CartConfig;
}

/**
 * Holds which global overlay (account panel / cart drawer / search) is open and
 * renders all three. The header icons call `openAccount` / `openCart` /
 * `openSearch`; anything under the provider can read the context via `useOverlay()`.
 * The texts of the search panel and the cart drawer come from the CMS (props).
 */
export function OverlayProvider({ children, searchConfig, popularProducts, cartConfig }: OverlayProviderProps) {
  const [current, setCurrent] = useState<Overlay>(null);

  const close = useCallback(() => setCurrent(null), []);
  const openAccount = useCallback(() => setCurrent("account"), []);
  const openCart = useCallback(() => setCurrent("cart"), []);
  const openSearch = useCallback(() => setCurrent("search"), []);

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
    () => ({ openAccount, openCart, openSearch, close, current }),
    [openAccount, openCart, openSearch, close, current],
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <AccountModal open={current === "account"} onClose={close} />
      <CartDrawer open={current === "cart"} onClose={close} config={cartConfig} onOpenAccount={openAccount} />
      <SearchOverlay open={current === "search"} onClose={close} config={searchConfig} popular={popularProducts} />
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
