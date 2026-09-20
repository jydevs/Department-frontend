"use client";

import { useOverlay } from "./OverlayProvider";
import { footerLinkClass } from "./footerStyles";

/** "Cuenta" column items — open the global account panel / cart drawer. */
export function FooterAccountLinks() {
  const { openAccount, openCart } = useOverlay();

  return (
    <ul className="flex flex-col items-start gap-3">
      <li>
        <button type="button" onClick={openAccount} className={footerLinkClass}>
          Mi cuenta
        </button>
      </li>
      <li>
        <button type="button" onClick={openCart} className={footerLinkClass}>
          Carrito
        </button>
      </li>
    </ul>
  );
}
