"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Right-side cart drawer. Empty state only (no cart logic). API: controlled via
 * `open` / `onClose`. Global wiring to the header cart icon happens in
 * `feature/overlay-state` (Tanda 4).
 *
 * Features:
 * - Slide-in animation from right
 * - Focus management (close button receives focus on open)
 * - Keyboard support (Escape to close)
 * - Click-outside-to-close (backdrop)
 */
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Slide-in animation: component mounts when open, unmounts when closed
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Focus the close button after the component mounts
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    } else {
      setMounted(false);
    }
  }, [open]);

  // Handle Escape key to close the drawer
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Carrito"
    >
      {/* Backdrop: click to close (but not if click is inside the panel) */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {/* Panel: slides in from right */}
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-sm bg-dept-white text-dept-black flex flex-col transition-transform duration-300 ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button: top-right */}
        <div className="flex justify-end p-4">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* Empty cart message: centered */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <h2 className="font-display text-2xl">TU CARRITO ESTÁ VACÍO</h2>
          <p className="font-body text-sm text-dept-gray-500">
            ¿Tienes una cuenta?{" "}
            {/* TODO: wire up to account modal or sign-in flow */}
            <button type="button" className="underline hover:opacity-70 transition-opacity">
              Inicia sesión
            </button>
            {" "}para pagar más rápido.
          </p>

          {/* Continue shopping button */}
          {/* TODO: add cart items render here */}
          <button
            type="button"
            onClick={onClose}
            className="mt-2 bg-dept-red px-8 py-3 font-condensed text-sm text-dept-white hover:bg-dept-red-dark transition-colors"
          >
            SEGUIR COMPRANDO
          </button>
        </div>
      </aside>
    </div>
  );
}
