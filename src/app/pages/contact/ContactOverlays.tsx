"use client";

import { useState } from "react";
import { AccountModal } from "@/components/layout/AccountModal";
import { CartDrawer } from "@/components/layout/CartDrawer";

/**
 * TEMPORARY review harness — two triggers to open the account panel / cart
 * drawer. `feature/overlay-state` (Tanda 4) removes this and wires the overlays
 * to the header icons via shared state.
 */
export function ContactOverlays() {
  const [account, setAccount] = useState(false);
  const [cart, setCart] = useState(false);

  return (
    <div className="mt-8 flex gap-3">
      <button
        type="button"
        onClick={() => setAccount(true)}
        className="font-condensed border border-dept-black px-4 py-2 text-xs text-dept-black"
      >
        Abrir cuenta
      </button>
      <button
        type="button"
        onClick={() => setCart(true)}
        className="font-condensed border border-dept-black px-4 py-2 text-xs text-dept-black"
      >
        Abrir carrito
      </button>

      <AccountModal open={account} onClose={() => setAccount(false)} />
      <CartDrawer open={cart} onClose={() => setCart(false)} />
    </div>
  );
}
