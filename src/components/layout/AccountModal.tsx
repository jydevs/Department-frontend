"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/lib/account/useCustomer";

/**
 * Account dropdown panel anchored under the header's account icon (top-right).
 * Signed out: log in / create account. Signed in: the customer's name and shortcuts to the account area.
 * Closes on backdrop click / Escape; focus moves into the panel on open, stays inside while it is open and returns to
 * the icon that opened it. API: controlled via `open` / `onClose`.
 */
interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

const ghostBtn =
  "font-condensed flex flex-1 items-center justify-center gap-2 border border-white/20 py-3 text-[11px] tracking-[0.2em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function AccountPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { status, customer, logout } = useCustomer();
  const panelRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const handleLogout = async () => {
    setLeaving(true);
    await logout();
    setLeaving(false);
    onClose();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Cuenta">
      <style>{`@keyframes account-in{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="account-modal"
        style={{ animation: "account-in 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
        className="absolute right-[var(--gutter)] top-[calc(var(--chrome-h)+0.5rem)] w-[min(20rem,calc(100vw-2rem))] border border-white/15 bg-dept-black p-5 text-dept-white shadow-2xl"
      >
        <p className="font-condensed text-[11px] tracking-[0.28em] text-dept-gray-500">Cuenta</p>

        {status === "loading" && (
          <div role="status" aria-live="polite" className="mt-4">
            <span className="sr-only">Cargando tu cuenta…</span>
            <div aria-hidden className="h-5 w-40 animate-pulse bg-white/10" />
            <div aria-hidden className="mt-2 h-3 w-52 animate-pulse bg-white/10" />
            <div aria-hidden className="mt-5 h-12 animate-pulse bg-white/10" />
          </div>
        )}

        {status === "authenticated" && customer && (
          <>
            <p data-testid="account-modal-name" className="font-display mt-3 truncate text-display-md leading-none">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="font-condensed mt-2 truncate text-xs tracking-[0.08em] text-dept-gray-300">{customer.email}</p>

            <Link
              href="/account"
              onClick={onClose}
              className="font-condensed mt-4 block w-full bg-dept-white py-3.5 text-center text-sm tracking-[0.14em] text-dept-black transition-colors duration-300 hover:bg-dept-red hover:text-dept-white"
            >
              Mi cuenta
            </Link>

            <div className="mt-2 flex gap-2">
              <Link href="/account/orders" onClick={onClose} className={ghostBtn}>
                <Icon>
                  <path d="M5 8h14l-1.2 12H6.2L5 8z" />
                  <path d="M9 8V7a3 3 0 016 0v1" />
                </Icon>
                Pedidos
              </Link>
              <Link href="/account/addresses" onClick={onClose} className={ghostBtn}>
                <Icon>
                  <path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </Icon>
                Direcciones
              </Link>
            </div>

            <button
              type="button"
              data-testid="modal-logout-btn"
              onClick={handleLogout}
              disabled={leaving}
              className="font-condensed mt-4 w-full border-t border-white/10 pt-4 text-left text-[11px] tracking-[0.2em] text-dept-gray-300 transition-colors hover:text-dept-white disabled:opacity-50"
            >
              {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </>
        )}

        {status === "anonymous" && (
          <>
            <Link
              href="/account/login"
              onClick={onClose}
              className="font-condensed mt-4 block w-full bg-dept-blue py-3.5 text-center text-sm tracking-[0.14em] text-dept-white transition-[filter] duration-300 hover:brightness-110"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/account/register"
              onClick={onClose}
              className="font-condensed mt-2 block w-full bg-dept-red-dark py-3 text-center text-[11px] tracking-[0.18em] text-dept-white transition-colors duration-300 hover:bg-dept-red"
            >
              Crear cuenta
            </Link>

            <p className="font-condensed mt-4 text-[11px] leading-relaxed tracking-[0.08em] text-dept-gray-500">
              Con tu cuenta ves tus pedidos, guardas direcciones y compras más rápido.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  return open ? <AccountPanel onClose={onClose} /> : null;
}
