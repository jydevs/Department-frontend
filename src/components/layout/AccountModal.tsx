"use client";

import { useEffect, useRef } from "react";

/**
 * Account dropdown panel anchored to the top-right, shown from the header
 * account icon. Small dropdown-style panel with login options, order/profile links,
 * and alternative login methods. Closed via backdrop click or Escape key.
 * API: controlled via `open` / `onClose`.
 */
interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management & Escape key handler
  useEffect(() => {
    if (!open) return;

    // Move focus to the first button on open
    if (firstButtonRef.current) {
      firstButtonRef.current.focus();
    }

    // Escape key closes the modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-label="Cuenta"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/20"
      />

      {/* Panel */}
      <div className="absolute right-4 top-16 md:right-10 w-[300px] bg-dept-white text-dept-black p-4 shadow-xl opacity-0 animate-in fade-in zoom-in-95 duration-200">
        <p className="font-condensed text-[11px] tracking-widest text-dept-gray-500">
          CUENTA
        </p>

        {/* Iniciar sesión con shop button */}
        <button
          ref={firstButtonRef}
          type="button"
          className="mt-3 w-full bg-dept-blue py-2.5 font-condensed text-sm text-dept-white"
        >
          Iniciar sesión con{" "}
          <span className="font-semibold lowercase">shop</span>
          {/* TODO: implement login action */}
        </button>

        {/* Otras opciones de inicio de sesión button */}
        <button
          type="button"
          className="mt-2 w-full bg-dept-red-dark py-2 font-condensed text-[11px] tracking-wide text-dept-white"
        >
          OTRAS OPCIONES DE INICIO DE SESIÓN
          {/* TODO: implement alternative login options */}
        </button>

        {/* Pedidos and Perfil navigation buttons */}
        <div className="mt-3 flex gap-2">
          {/* Pedidos button with bag icon */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 border border-dept-gray-300 py-2 font-condensed text-[11px]"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l1.5-3h9l1.5 3M6 9h12a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V10a1 1 0 011-1zm4-4V7a1 1 0 011-1h2a1 1 0 011 1v2" />
            </svg>
            <span>Pedidos</span>
            {/* TODO: navigate to orders */}
          </button>

          {/* Perfil button with person icon */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 border border-dept-gray-300 py-2 font-condensed text-[11px]"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
            <span>Perfil</span>
            {/* TODO: navigate to profile */}
          </button>
        </div>
      </div>
    </div>
  );
}
