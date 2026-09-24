"use client";

import { useEffect, useRef } from "react";

/**
 * Account dropdown panel anchored under the header's account icon (top-right).
 * Login options + Pedidos / Perfil shortcuts (no auth backend yet — TODOs).
 * Closes on backdrop click / Escape; focus moves to the first action on open.
 * API: controlled via `open` / `onClose`.
 */
interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

const ghostBtn =
  "font-condensed flex flex-1 items-center justify-center gap-2 border border-white/20 py-3 text-[11px] tracking-[0.2em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black";

function AccountPanel({ onClose }: { onClose: () => void }) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Cuenta">
      <style>{`@keyframes account-in{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div
        style={{ animation: "account-in 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
        className="absolute right-[var(--gutter)] top-[calc(var(--chrome-h)+0.5rem)] w-[min(20rem,calc(100vw-2rem))] border border-white/15 bg-dept-black p-5 text-dept-white shadow-2xl"
      >
        <p className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500">Cuenta</p>

        {/* TODO: implement login action */}
        <button
          ref={firstButtonRef}
          type="button"
          className="font-condensed mt-4 w-full bg-dept-blue py-3.5 text-sm tracking-[0.14em] text-dept-white transition-[filter] duration-300 hover:brightness-110"
        >
          Iniciar sesión con <span className="font-semibold lowercase tracking-normal">shop</span>
        </button>

        {/* TODO: implement alternative login options */}
        <button
          type="button"
          className="font-condensed mt-2 w-full bg-dept-red-dark py-3 text-[11px] tracking-[0.18em] text-dept-white transition-colors duration-300 hover:bg-dept-red"
        >
          Otras opciones de inicio de sesión
        </button>

        <div className="mt-4 flex gap-2">
          {/* TODO: navigate to orders */}
          <button type="button" className={ghostBtn}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1.2 12H6.2L5 8z" />
              <path d="M9 8V7a3 3 0 016 0v1" />
            </svg>
            Pedidos
          </button>
          {/* TODO: navigate to profile */}
          <button type="button" className={ghostBtn}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Perfil
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  return open ? <AccountPanel onClose={onClose} /> : null;
}
