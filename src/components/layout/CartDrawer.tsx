"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { canOptimize } from "@/lib/api/media";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CART_CONFIG, type CartConfig } from "./config";

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
  config?: CartConfig;
  /** opens the account panel (used by the highlighted text of the empty state) */
  onOpenAccount?: () => void;
}

const stepBtn =
  "flex h-9 w-9 items-center justify-center border border-white/20 text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dept-white";

/** Empty-state sentence with an optional underlined fragment that opens the account panel. */
function EmptyText({ text, highlight, onHighlight }: { text: string; highlight?: string; onHighlight?: () => void }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{text}</>;
  const className = "text-dept-white underline underline-offset-4";
  return (
    <>
      {text.slice(0, at)}
      {onHighlight ? (
        <button type="button" onClick={onHighlight} className={className}>
          {highlight}
        </button>
      ) : (
        <span className={className}>{highlight}</span>
      )}
      {text.slice(at + highlight.length)}
    </>
  );
}

function CartPanel({ onClose, config, onOpenAccount }: { onClose: () => void; config: CartConfig; onOpenAccount?: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { items, count, subtotal, setQty, remove } = useCart();

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
      aria-label={config.title}
    >
      <style>{`@keyframes cart-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes cart-fade-in{from{opacity:0}to{opacity:1}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label={config.closeLabel}
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
            {config.title}{" "}
            <span className="font-condensed align-top text-[11px] tracking-[0.2em] text-dept-gray-500">
              {String(count).padStart(2, "0")}
            </span>
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={config.closeLabel}
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
            <p className="font-display text-display-md">{config.emptyTitle}</p>
            <p className="max-w-[28ch] text-sm text-dept-white/60">
              <EmptyText text={config.emptyText} highlight={config.emptyTextHighlight} onHighlight={onOpenAccount} />
            </p>
            <Button
              variant="red"
              size="lg"
              arrow
              onClick={onClose}
              data-testid="continue-shopping-btn"
              className="mt-2"
            >
              {config.continueLabel}
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {items.map((item) => (
                <li
                  key={`${item.handle}-${item.size}`}
                  className="grid grid-cols-[84px_1fr] gap-4 border-b border-white/10 py-5"
                >
                  <Link
                    href={`/products/${item.handle}`}
                    onClick={onClose}
                    className="relative block aspect-[4/5] overflow-hidden bg-dept-gray-900"
                  >
                    {item.product.images[0] && (
                      <Image
                        src={item.product.images[0]}
                        unoptimized={!canOptimize(item.product.images[0])}
                        alt={item.product.imageLabel}
                        fill
                        sizes="84px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.handle}`}
                          onClick={onClose}
                          className="link-underline font-condensed text-[13px] leading-snug tracking-[0.1em]"
                        >
                          {item.product.name}
                        </Link>
                        <p className="font-condensed mt-1 text-[11px] tracking-[0.2em] text-dept-gray-500">
                          {config.sizeLabel} {item.size}
                        </p>
                      </div>
                      <p className="font-condensed shrink-0 text-[13px] tracking-[0.06em] tabular-nums">
                        {formatCOP(item.total)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center" role="group" aria-label={`Cantidad de ${item.product.name}`}>
                        <button
                          type="button"
                          className={stepBtn}
                          aria-label={config.decreaseLabel}
                          onClick={() => setQty(item.handle, item.size, item.qty - 1)}
                        >
                          −
                        </button>
                        <span className="font-condensed flex h-9 w-10 items-center justify-center border-y border-white/20 text-sm tabular-nums" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          className={stepBtn}
                          aria-label={config.increaseLabel}
                          disabled={item.qty >= item.max}
                          onClick={() => setQty(item.handle, item.size, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        data-testid="remove-item-btn"
                        onClick={() => remove(item.handle, item.size)}
                        className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300 hover:text-dept-white"
                      >
                        {config.removeLabel}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 px-6 py-6">
              <div className="flex items-baseline justify-between">
                <span className="font-condensed text-[11px] tracking-[0.24em] text-dept-gray-300">{config.subtotalLabel}</span>
                <span data-testid="cart-subtotal" className="font-display text-display-md tabular-nums">{formatCOP(subtotal)}</span>
              </div>
              <Button
                href={config.checkoutHref}
                variant="red"
                size="lg"
                arrow
                className="mt-5 w-full"
                onClick={onClose}
              >
                {config.checkoutLabel}
              </Button>
              <button
                type="button"
                data-testid="continue-shopping-btn"
                onClick={onClose}
                className="link-underline font-condensed mx-auto mt-2 block text-[11px] tracking-[0.2em] text-dept-white/70 hover:text-dept-white"
              >
                {config.continueLabel}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/** Mounts the panel only while open, so its local state (checkout note) resets on close. */
export function CartDrawer({ open, onClose, config = DEFAULT_CART_CONFIG, onOpenAccount }: CartDrawerProps) {
  return open ? <CartPanel onClose={onClose} config={config} onOpenAccount={onOpenAccount} /> : null;
}
