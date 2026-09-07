"use client";

import { useEffect, useRef } from "react";

/**
 * Right-side cart drawer. Empty state only (no cart logic). API: controlled via
 * `open` / `onClose`. Global wiring to the header cart icon happens in
 * `feature/overlay-state` (Tanda 4).
 *
 * - Slide-in from the right (CSS keyframe on mount)
 * - Focus moves to the close button on open
 * - Escape and backdrop click close
 */
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Carrito"
    >
      <style>{`@keyframes cart-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {/* Panel */}
      <aside
        style={{ animation: "cart-drawer-in 0.3s ease-out" }}
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-dept-white text-dept-black"
      >
        <div className="flex justify-end p-4">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="text-2xl leading-none transition-opacity hover:opacity-70"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <h2 className="font-display text-2xl">Tu carrito está vacío</h2>
          <p className="font-body text-sm text-dept-gray-500">
            ¿Tienes una cuenta?{" "}
            {/* TODO: abrir el panel de cuenta / flujo de login */}
            <button type="button" className="underline transition-opacity hover:opacity-70">
              Inicia sesión
            </button>{" "}
            para pagar más rápido.
          </p>
          {/* TODO: render de líneas del carrito cuando exista lógica de carrito */}
          <button
            type="button"
            onClick={onClose}
            className="mt-2 bg-dept-red px-8 py-3 font-condensed text-sm text-dept-white transition-colors hover:bg-dept-red-dark"
          >
            Seguir comprando
          </button>
        </div>
      </aside>
    </div>
  );
}
