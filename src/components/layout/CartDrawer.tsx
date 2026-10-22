"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { canOptimize } from "@/lib/api/media";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CART_CONFIG, type CartConfig } from "./config";

/**
 * Right-side cart drawer, wired to the SERVER cart (`useCart`): every price, discount and total on screen comes from
 * the API's quote. Lines with thumbnail / size / unit price / quantity stepper / remove, discount code, summary
 * and the checkout button. API: controlled via `open` / `onClose` (see OverlayProvider).
 *
 * - slide-in from the right (CSS keyframe on mount)
 * - focus moves into the panel on open, Tab is kept inside it, Escape / backdrop close, and focus returns to the
 *   button that opened it
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

function DiscountBox({ discountCode, discountAmount }: { discountCode: string | null; discountAmount: number }) {
  const { applyDiscount, removeDiscount } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const inputId = useId();
  const msgId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setMessage("Escribe tu código de descuento.");
      return;
    }
    setWorking(true);
    setMessage(null);
    const issue = await applyDiscount(value);
    setWorking(false);
    if (issue) setMessage(issue.fields?.code ?? issue.message);
    else setCode("");
  };

  const remove = async () => {
    setWorking(true);
    const issue = await removeDiscount();
    setWorking(false);
    setMessage(issue ? issue.message : null);
  };

  if (discountCode) {
    return (
      <div data-testid="discount-applied" className="flex items-center justify-between gap-3 border border-white/15 px-3 py-2.5">
        <p className="font-condensed text-xs tracking-[0.12em]">
          <span className="sr-only">Código de descuento aplicado: </span>
          <span className="text-dept-white">{discountCode}</span>
          {discountAmount > 0 && <span className="text-dept-gray-300"> · −{formatCOP(discountAmount)}</span>}
        </p>
        <button
          type="button"
          data-testid="discount-remove"
          onClick={remove}
          disabled={working}
          className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300 hover:text-dept-white disabled:opacity-40"
        >
          Quitar
        </button>
        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="font-condensed block text-[11px] tracking-[0.2em] text-dept-gray-300">
        Código de descuento
      </label>
      <div className="mt-2 flex">
        <input
          id={inputId}
          data-testid="discount-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (message) setMessage(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={message ? true : undefined}
          aria-describedby={msgId}
          className="font-condensed h-11 min-w-0 flex-1 border border-white/20 bg-transparent px-3 text-sm uppercase tracking-[0.1em] text-dept-white outline-none focus:border-dept-white"
        />
        <button
          type="submit"
          data-testid="discount-apply"
          disabled={working}
          className="font-condensed h-11 border border-l-0 border-white/20 px-4 text-xs tracking-[0.16em] transition-colors hover:bg-dept-white hover:text-dept-black disabled:opacity-40"
        >
          {working ? "Aplicando…" : "Aplicar"}
        </button>
      </div>
      <p id={msgId} role="alert" data-testid="discount-error" className="font-condensed mt-2 min-h-4 text-xs tracking-[0.06em] text-dept-red-light">
        {message}
      </p>
    </form>
  );
}

function CartSkeleton() {
  return (
    <div data-testid="cart-loading" role="status" aria-live="polite" className="flex-1 px-6 py-5">
      <span className="sr-only">Cargando tu carrito…</span>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden className="grid grid-cols-[84px_1fr] gap-4 border-b border-white/10 py-5">
          <div className="aspect-[4/5] animate-pulse bg-white/10" />
          <div className="space-y-3">
            <div className="h-3 w-3/4 animate-pulse bg-white/10" />
            <div className="h-3 w-1/3 animate-pulse bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CartPanel({ onClose, config, onOpenAccount }: { onClose: () => void; config: CartConfig; onOpenAccount?: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { items, count, cart, ready, busy, error, notice, setVariantQty, removeVariant, dismiss, refresh } = useCart();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    void refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [onClose, refresh]);

  const blocked = items.some((i) => !i.available) || cart.warnings.some((w) => w.code === "VARIANT_UNAVAILABLE");
  const message = error ?? (notice ? { message: notice, code: "NOTICE" } : null);
  const loading = !ready && items.length === 0;

  return (
    <div
      data-testid="cart-drawer"
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      aria-busy={busy || loading}
    >
      <style>{`@keyframes cart-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes cart-fade-in{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion: reduce){[data-testid="cart-drawer"] *{animation-duration:.01ms !important}}`}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label={config.closeLabel}
        tabIndex={-1}
        onClick={onClose}
        style={{ animation: "cart-fade-in 0.4s ease-out both" }}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        style={{ animation: "cart-drawer-in 0.5s cubic-bezier(0.16,1,0.3,1)" }}
        className="absolute right-0 top-0 flex h-full w-full max-w-[28rem] flex-col border-l border-white/10 bg-dept-black text-dept-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h2 className="font-display text-display-md">
            {config.title}{" "}
            <span className="font-condensed align-top text-[11px] tracking-[0.2em] text-dept-gray-500" aria-label={`${count} productos`}>
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

        {/* errors and notices are announced as they appear */}
        <div role="alert" aria-live="assertive" className={message ? "" : "hidden"}>
          {message && (
            <div
              data-testid={error ? "cart-error" : "cart-notice"}
              className={clsx(
                "mx-6 mt-4 flex items-start justify-between gap-3 border p-3 font-condensed text-xs leading-relaxed tracking-[0.06em]",
                error ? "border-dept-red bg-dept-red/10 text-dept-red-light" : "border-white/20 bg-white/5 text-dept-white/80",
              )}
            >
              <p>{message.message}</p>
              <button type="button" onClick={dismiss} aria-label="Cerrar aviso" className="shrink-0 text-base leading-none hover:opacity-60">
                ×
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <CartSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center" data-testid="cart-empty">
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
            <ul className="flex-1 overflow-y-auto px-6" data-testid="cart-lines">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  data-testid="cart-line"
                  className={clsx("grid grid-cols-[84px_1fr] gap-4 border-b border-white/10 py-5", item.pending && "opacity-80")}
                >
                  {(() => {
                    const thumb = item.product.images[0] && (
                      <Image
                        src={item.product.images[0]}
                        unoptimized={!canOptimize(item.product.images[0])}
                        alt=""
                        fill
                        sizes="84px"
                        className="object-cover"
                      />
                    );
                    const frame = "relative block aspect-[4/5] overflow-hidden bg-dept-gray-900";
                    return item.handle ? (
                      <Link href={`/products/${item.handle}`} onClick={onClose} className={frame} aria-label={item.product.name}>
                        {thumb}
                      </Link>
                    ) : (
                      <span className={frame}>{thumb}</span>
                    );
                  })()}

                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {item.handle ? (
                          <Link
                            href={`/products/${item.handle}`}
                            onClick={onClose}
                            className="link-underline font-condensed text-[13px] leading-snug tracking-[0.1em]"
                          >
                            {item.product.name}
                          </Link>
                        ) : (
                          <p className="font-condensed text-[13px] leading-snug tracking-[0.1em]">{item.product.name}</p>
                        )}
                        {item.size && (
                          <p className="font-condensed mt-1 text-[11px] tracking-[0.2em] text-dept-gray-500">
                            {config.sizeLabel} {item.size}
                          </p>
                        )}
                        <p className="font-condensed mt-1 text-[11px] tracking-[0.1em] tabular-nums text-dept-gray-300">
                          <span className="sr-only">Precio unitario: </span>
                          {formatCOP(item.price)}
                          {item.compareAtPrice != null && item.compareAtPrice > item.price && (
                            <span className="ml-2 text-dept-gray-500 line-through">{formatCOP(item.compareAtPrice)}</span>
                          )}
                        </p>
                        {!item.available && (
                          <p className="font-condensed mt-1 text-[11px] tracking-[0.1em] text-dept-red-light">Ya no está disponible. Elimínalo para continuar.</p>
                        )}
                      </div>
                      <p
                        data-testid="cart-line-total"
                        className={clsx("font-condensed shrink-0 text-[13px] tracking-[0.06em] tabular-nums", item.pending && "text-dept-gray-300")}
                      >
                        {formatCOP(item.total)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center" role="group" aria-label={`Cantidad de ${item.product.name}`}>
                        <button
                          type="button"
                          data-testid="qty-decrease"
                          className={stepBtn}
                          aria-label={config.decreaseLabel}
                          onClick={() => void setVariantQty(item.variantId, item.qty - 1)}
                        >
                          −
                        </button>
                        <span
                          data-testid="cart-line-qty"
                          className="font-condensed flex h-9 w-10 items-center justify-center border-y border-white/20 text-sm tabular-nums"
                          aria-live="polite"
                          aria-label={`${item.qty} unidades`}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          data-testid="qty-increase"
                          className={stepBtn}
                          aria-label={config.increaseLabel}
                          disabled={item.qty >= item.max}
                          onClick={() => void setVariantQty(item.variantId, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        data-testid="remove-item-btn"
                        aria-label={`${config.removeLabel} ${item.product.name}`}
                        onClick={() => void removeVariant(item.variantId)}
                        className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300 hover:text-dept-white"
                      >
                        {config.removeLabel}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-4 border-t border-white/10 px-6 py-5">
              <DiscountBox discountCode={cart.discountCode} discountAmount={cart.discountTotal} />

              <dl className={clsx("font-condensed space-y-2 text-xs tracking-[0.12em] transition-opacity", busy && "opacity-60")} aria-busy={busy}>
                <div className="flex justify-between text-dept-gray-300">
                  <dt>{config.subtotalLabel}</dt>
                  <dd data-testid="cart-subtotal" className="tabular-nums text-dept-white">
                    {formatCOP(cart.subtotal)}
                  </dd>
                </div>
                {cart.discountTotal > 0 && (
                  <div className="flex justify-between text-dept-gray-300">
                    <dt>Descuento{cart.discountCode ? ` (${cart.discountCode})` : ""}</dt>
                    <dd data-testid="cart-discount" className="tabular-nums text-dept-white">
                      −{formatCOP(cart.discountTotal)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-dept-gray-300">
                  <dt>Envío</dt>
                  <dd className="text-dept-white/70">Se calcula al pagar</dd>
                </div>
                {!cart.taxIncluded && (
                  <div className="flex justify-between text-dept-gray-300">
                    <dt>IVA</dt>
                    <dd className="tabular-nums text-dept-white">{formatCOP(cart.taxTotal)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-white/10 pt-3 text-dept-white">
                  <dt className="text-[11px] tracking-[0.24em]">Total estimado</dt>
                  <dd data-testid="cart-total" className="font-display text-display-md tabular-nums">
                    {formatCOP(cart.total)}
                  </dd>
                </div>
              </dl>
              {cart.taxIncluded && <p className="font-condensed text-[11px] tracking-[0.1em] text-dept-gray-500">Precios con IVA incluido. El envío se suma al elegir tu dirección.</p>}

              {blocked ? (
                <Button variant="red" size="lg" disabled className="w-full" data-testid="checkout-btn">
                  {config.checkoutLabel}
                </Button>
              ) : (
                <Button href={config.checkoutHref} variant="red" size="lg" arrow className="w-full" onClick={onClose}>
                  {config.checkoutLabel}
                </Button>
              )}
              <button
                type="button"
                data-testid="continue-shopping-btn"
                onClick={onClose}
                className="link-underline font-condensed mx-auto block text-[11px] tracking-[0.2em] text-dept-white/70 hover:text-dept-white"
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

/** Mounts the panel only while open, so its local state (discount field) resets on close. */
export function CartDrawer({ open, onClose, config = DEFAULT_CART_CONFIG, onOpenAccount }: CartDrawerProps) {
  return open ? <CartPanel onClose={onClose} config={config} onOpenAccount={onOpenAccount} /> : null;
}
