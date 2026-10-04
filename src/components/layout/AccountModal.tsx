"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, retrySession, useAccount } from "@/lib/account";
import { useFocusTrap } from "@/lib/useFocusTrap";

/**
 * Account dropdown panel anchored under the header's account icon (top-right).
 * Sin sesión: iniciar sesión / crear cuenta. Con sesión: Mi cuenta, Pedidos y Cerrar sesión (API real).
 * Modal: focus trap, focus moves to the first action on open and returns to the opener on close;
 * closes on backdrop click / Escape.
 * API: controlled via `open` / `onClose`.
 */
interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

const ghostBtn =
  "font-condensed flex flex-1 items-center justify-center gap-2 border border-white/20 py-3 text-[11px] tracking-[0.2em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black";

function AccountPanel({ onClose }: { onClose: () => void }) {
  const firstButtonRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose, initialFocus: firstButtonRef });
  const titleId = useId();
  const { status, customer } = useAccount();
  const router = useRouter();
  const authed = status === "authenticated";

  const signOut = () => {
    void logout().then((ok) => {
      onClose();
      // si el servidor no confirmó, el aviso se muestra en la pantalla de inicio de sesión
      router.push(ok ? "/" : "/account/login");
    });
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
        ref={panelRef}
        tabIndex={-1}
        data-testid="account-modal"
        style={{ animation: "account-in 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
        className="absolute right-[var(--gutter)] top-[calc(var(--chrome-h)+0.5rem)] w-[min(20rem,calc(100vw-2rem))] border border-white/15 bg-dept-black p-5 text-dept-white shadow-2xl outline-none"
      >
        <p id={titleId} className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500">Cuenta</p>

        {status === "unavailable" && (
          <p role="alert" className="font-condensed mt-3 text-xs tracking-[0.08em] text-dept-red-light">
            No pudimos comprobar tu sesión.{" "}
            <button type="button" onClick={retrySession} className="underline underline-offset-4">Reintentar</button>
          </p>
        )}

        {authed ? (
          <>
            <p className="font-condensed mt-3 truncate text-xs tracking-[0.1em] text-dept-gray-300" data-testid="account-modal-user">{customer?.firstName} · {customer?.email}</p>
            <Link ref={firstButtonRef} href="/account" onClick={onClose} className="font-condensed mt-4 block text-center w-full bg-dept-blue py-3.5 text-sm tracking-[0.14em] text-dept-white transition-[filter] duration-300 hover:brightness-110">
              Mi cuenta
            </Link>
            {customer?.isStaff && (
              <Link
                href="/admin"
                onClick={onClose}
                className="font-condensed mt-2 block text-center w-full bg-dept-red-dark py-3 text-[11px] tracking-[0.18em] text-dept-white transition-colors duration-300 hover:bg-dept-red"
              >
                PANEL DE ADMINISTRACIÓN
              </Link>
            )}
            <div className="mt-2 flex gap-2">
              <Link href="/account/orders" onClick={onClose} className={ghostBtn}>Pedidos</Link>
              <button type="button" data-testid="account-modal-logout" onClick={signOut} className={ghostBtn}>
                Cerrar sesión
              </button>
            </div>
          </>
        ) : (
          <>
            <Link ref={firstButtonRef} href="/account/login" onClick={onClose} className="font-condensed mt-4 block text-center w-full bg-dept-blue py-3.5 text-sm tracking-[0.14em] text-dept-white transition-[filter] duration-300 hover:brightness-110">
              Iniciar sesión
            </Link>
            <Link href="/account/register" onClick={onClose} className="font-condensed mt-2 block text-center w-full bg-dept-red-dark py-3 text-[11px] tracking-[0.18em] text-dept-white transition-colors duration-300 hover:bg-dept-red">
              Crear cuenta
            </Link>
            <div className="mt-4 flex gap-2">
              <Link href="/account/orders" onClick={onClose} className={ghostBtn}>Pedidos</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  return open ? <AccountPanel onClose={onClose} /> : null;
}
