"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { safeHref } from "@/lib/url";
import { cfg, useSite } from "./SiteProvider";

/**
 * Right-side cart drawer, wired to the client cart (`useCart`). Lines with
 * thumbnail / size / quantity stepper / remove, subtotal, checkout stub.
 * API: controlled via `open` / `onClose` (see OverlayProvider).
 *
 * - slide-in from the right (CSS keyframe on mount)
 * - focus moves to the close button on open; Escape and backdrop close
 */
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const stepBtn =
  "flex h-9 w-9 items-center justify-center border border-white/20 text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dept-white";

function CartPanel({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { items, count, subtotal, setQty, remove, busy, error, warnings } = useCart();
  const c = cfg(useSite().cart);
  const L = {
    title: c.str("title", "Carrito"), close: c.str("closeLabel", "Cerrar"), emptyTitle: c.str("emptyTitle", "Tu carrito está vacío"),
    emptyText: c.str("emptyText", "¿Tienes una cuenta? Inicia sesión para pagar más rápido."), highlight: c.str("emptyTextHighlight", "Inicia sesión"),
    cont: c.str("continueLabel", "Seguir comprando"), checkout: c.str("checkoutLabel", "Finalizar compra"), subtotal: c.str("subtotalLabel", "Subtotal"),
    size: c.str("sizeLabel", "Talla"), remove: c.str("removeLabel", "Eliminar"), dec: c.str("decreaseLabel", "Quitar una unidad"), inc: c.str("increaseLabel", "Añadir una unidad"),
  };
  const checkoutHref = safeHref(c.str("checkoutHref", "/checkout")) ?? "/checkout";
  const [before, after] = L.highlight && L.emptyText.includes(L.highlight) ? L.emptyText.split(L.highlight) : [L.emptyText, ""];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      data-testid="cart-drawer"
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={L.title}
    >
      <style>{`@keyframes cart-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes cart-fade-in{from{opacity:0}to{opacity:1}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label={L.close}
        onClick={onClose}
        style={{ animation: "cart-fade-in 0.4s ease-out both" }}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <aside
        style={{ animation: "cart-drawer-in 0.5s cubic-bezier(0.16,1,0.3,1)" }}
        className="absolute right-0 top-0 flex h-full w-full max-w-[28rem] flex-col border-l border-white/10 bg-dept-black text-dept-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h2 className="font-display text-display-md">
            {L.title}{" "}
            <span className="font-condensed align-top text-[11px] tracking-[0.2em] text-dept-gray-500">
              {String(count).padStart(2, "0")}
            </span>
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={L.close}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="font-display text-display-md">{L.emptyTitle}</p>
            <p className="max-w-[28ch] text-sm text-dept-white/60">
              {before}
              {after !== "" || L.emptyText.includes(L.highlight) ? <span className="text-dept-white underline underline-offset-4">{L.highlight}</span> : null}
              {after}
            </p>
            <Button
              variant="red"
              size="lg"
              arrow
              onClick={onClose}
              data-testid="continue-shopping-btn"
              className="mt-2"
            >
              {L.cont}
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  className="grid grid-cols-[84px_1fr] gap-4 border-b border-white/10 py-5"
                >
                  <Link
                    href={item.handle ? `/products/${item.handle}` : "#"}
                    onClick={item.handle ? onClose : (e) => e.preventDefault()}
                    className="relative block aspect-[4/5] overflow-hidden bg-dept-gray-900"
                  >
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="84px" className="object-cover" />}
                  </Link>

                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={item.handle ? `/products/${item.handle}` : "#"}
                          onClick={item.handle ? onClose : (e) => e.preventDefault()}
                          className="link-underline font-condensed text-[13px] leading-snug tracking-[0.1em]"
                        >
                          {item.name}
                        </Link>
                        <p className="font-condensed mt-1 text-[11px] tracking-[0.2em] text-dept-gray-500">
                          {L.size} {item.size}{!item.available ? " · no disponible" : ""}
                        </p>
                      </div>
                      <p className="font-condensed shrink-0 text-[13px] tracking-[0.06em] tabular-nums">
                        {formatCOP(item.total)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center" role="group" aria-label={`Cantidad de ${item.name}`}>
                        <button
                          type="button"
                          className={stepBtn}
                          aria-label={L.dec}
                          disabled={busy}
                          onClick={() => void setQty(item.variantId, item.qty - 1)}
                        >
                          −
                        </button>
                        <span className="font-condensed flex h-9 w-10 items-center justify-center border-y border-white/20 text-sm tabular-nums" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          className={stepBtn}
                          aria-label={L.inc}
                          disabled={busy || item.qty >= item.maxQuantity}
                          onClick={() => void setQty(item.variantId, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        data-testid="remove-item-btn"
                        disabled={busy}
                        onClick={() => void remove(item.variantId)}
                        className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300 hover:text-dept-white"
                      >
                        {L.remove}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 px-6 py-6">
              {(error || warnings.length > 0) && (
                <p role="alert" data-testid="cart-warning" className="font-condensed mb-4 text-[11px] leading-relaxed tracking-[0.12em] text-dept-red-light">
                  {error ?? warnings.join(" · ")}
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-condensed text-[11px] tracking-[0.24em] text-dept-gray-300">{L.subtotal}</span>
                <span data-testid="cart-subtotal" className="font-display text-display-md tabular-nums">{formatCOP(subtotal)}</span>
              </div>
              <Button
                href={checkoutHref}
                variant="red"
                size="lg"
                arrow
                className="mt-5 w-full"
                onClick={onClose}
              >
                {L.checkout}
              </Button>
              <button
                type="button"
                data-testid="continue-shopping-btn"
                onClick={onClose}
                className="link-underline font-condensed mx-auto mt-2 block text-[11px] tracking-[0.2em] text-dept-white/70 hover:text-dept-white"
              >
                {L.cont}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** Mounts the panel only while open, so its local state (checkout note) resets on close. */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  return open ? <CartPanel onClose={onClose} /> : null;
}
