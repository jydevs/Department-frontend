"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Product } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { useOverlay } from "@/components/layout/OverlayProvider";
import { useCart } from "@/lib/cart";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";
import { StickyAddToCart } from "./StickyAddToCart";

const MIN_QTY = 1;

const microLabel = "text-[11px] tracking-[0.2em] text-dept-gray-500 uppercase";

const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(0)" },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface ProductDetailLabels {
  home: string; collection: string; collectionHandle: string; size: string; quantity: string; max: number; add: string; soldOut: string; sale: string;
  noPrice: string; sizeRequired: string; stickyAdd: string; stickyChoose: string; showDiscount: boolean; sticky: boolean;
}
export const DEFAULT_DETAIL_LABELS: ProductDetailLabels = {
  home: "Inicio", collection: "Clothes", collectionHandle: "all", size: "Talla", quantity: "Cantidad", max: 10, add: "Añadir al carrito", soldOut: "Agotado", sale: "Oferta",
  noPrice: "Precio no disponible", sizeRequired: "Selecciona una talla", stickyAdd: "Añadir", stickyChoose: "Elegir talla", showDiscount: true, sticky: true,
};

interface ProductInfoProps {
  product: Product;
  labels?: ProductDetailLabels;
}

/**
 * Product detail panel: breadcrumb, badge, name, price, blurb, size picker,
 * quantity stepper and the add-to-cart CTA (+ the mobile sticky bar).
 * `lg:sticky` so it stays in view while the tall photo column scrolls.
 */
export function ProductInfo({ product, labels = DEFAULT_DETAIL_LABELS }: ProductInfoProps) {
  const L = labels;
  const MAX_QTY = L.max;
  const { handle, name, price, compareAtPrice, badge, sizes, description, variants } = product;
  const soldOut = badge === "agotado";

  const { add, busy, error: cartError } = useCart();
  const { openCart } = useOverlay();

  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(MIN_QTY);
  const [showError, setShowError] = useState(false);

  const errorId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement>(null);

  const discount =
    compareAtPrice != null && compareAtPrice > price
      ? Math.round((1 - price / compareAtPrice) * 100)
      : null;

  /* ── size picker ─────────────────────────────────────── */

  const selectSize = (next: string) => {
    setSize(next);
    setShowError(false);
  };

  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (soldOut) return;
    const last = sizes.length - 1;
    const current = size ? sizes.indexOf(size) : -1;
    let next: number;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = current >= last ? 0 : current + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = current <= 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    selectSize(sizes[next]);
    chipRefs.current[next]?.focus();
  };

  /* ── add to cart ─────────────────────────────────────── */

  /** Missing size: flag it inline, nudge the chips, optionally bring them into view. */
  const requireSize = () => {
    setShowError(true);
    const group = groupRef.current;
    if (!group) return;
    group.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    chipRefs.current[0]?.focus({ preventScroll: true });
    if (!prefersReducedMotion() && typeof group.animate === "function") {
      group.animate(SHAKE_KEYFRAMES, { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
  };

  const handleAdd = async () => {
    if (soldOut) return;
    const chosenSize = size || sizes.find((s) => variants.find((v) => v.size === s)?.available) || sizes[0];
    if (!size && chosenSize) setSize(chosenSize);
    const variant = variants.find((v) => v.size === chosenSize);
    if (!variant) return requireSize();
    if (await add(variant.id, qty, handle)) openCart();
  };

  return (
    <div
      data-testid="product-info"
      className="px-gutter pt-8 pb-14 lg:sticky lg:top-[calc(var(--chrome-h)+1.5rem)] lg:self-start lg:pt-6 lg:pb-10"
    >
      {/* breadcrumb */}
      <nav aria-label="Migas de pan" data-testid="breadcrumb">
        <ol className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1", microLabel)}>
          <li>
            <Link href="/" className="transition-colors duration-300 ease-out-expo hover:text-dept-white">
              {L.home}<span className="sr-only"> Home</span>
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/collections/${L.collectionHandle}`}
              className="transition-colors duration-300 ease-out-expo hover:text-dept-white"
            >
              {L.collection}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-dept-white/70">
            {name}
          </li>
        </ol>
      </nav>

      {/* badge + name */}
      {badge && (
        <p
          className={clsx(
            "mt-8 inline-block px-2.5 py-1 font-condensed text-[11px] tracking-[0.2em]",
            badge === "agotado"
              ? "border border-white/40 bg-dept-black text-dept-white"
              : "border border-dept-red bg-dept-red text-dept-white",
          )}
        >
          {badge === "agotado" ? L.soldOut : L.sale}
        </p>
      )}
      <h1 className={clsx("font-display text-display-md text-balance", badge ? "mt-4" : "mt-8")}>{name}</h1>

      {/* price */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-condensed text-2xl tabular-nums tracking-[0.04em] md:text-3xl">
          <span className="sr-only">Precio: </span>
          <span data-testid="product-price">{price && price > 0 ? formatCOP(price) : L.noPrice}</span>
        </p>
        {L.showDiscount && discount != null && compareAtPrice != null && (
          <>
            <p className="font-condensed text-base tabular-nums text-dept-gray-500 line-through">
              <span className="sr-only">Precio anterior: </span>
              {formatCOP(compareAtPrice)}
            </p>
            <p className="bg-dept-red px-2 py-0.5 font-condensed text-[11px] tabular-nums tracking-[0.12em] text-dept-white">
              <span className="sr-only">Descuento </span>-{discount}%
            </p>
          </>
        )}
      </div>

      <div className="mt-6 max-w-prose space-y-3 font-body text-sm leading-relaxed text-white/70 md:text-base">
        {description.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* size */}
      <div className="mt-8 border-t border-white/10 pt-6">
        <p className={microLabel}>{L.size}</p>
        <div
          ref={groupRef}
          role="radiogroup"
          aria-label={L.size}
          aria-required
          aria-invalid={showError}
          aria-describedby={errorId}
          aria-disabled={soldOut || undefined}
          onKeyDown={onGroupKeyDown}
          className="mt-3 flex flex-wrap gap-2"
        >
          {sizes.map((s, i) => {
            const selected = size === s;
            return (
              <button
                key={s}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                data-testid="size-option"
                aria-checked={selected}
                disabled={soldOut || variants.find((v) => v.size === s)?.available === false}
                tabIndex={selected || (size === null && i === 0) ? 0 : -1}
                onClick={() => selectSize(s)}
                className={clsx(
                  "h-12 min-w-12 border px-3 font-condensed text-sm tracking-[0.12em]",
                  "transition-[background-color,color,border-color] duration-300 ease-out-expo",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  selected
                    ? "border-dept-white bg-dept-white text-dept-black"
                    : clsx(
                        "bg-transparent text-dept-white",
                        showError ? "border-dept-red" : "border-white/20",
                        !soldOut && "hover:border-dept-white",
                      ),
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {/* always mounted so the alert is announced when its text appears; reserved height = no layout shift */}
        <p id={errorId} role="alert" className="mt-2 min-h-5 font-body text-[13px] text-dept-red-light">
          {showError ? L.sizeRequired : cartError}
        </p>
      </div>

      {/* quantity */}
      <div className="mt-4">
        <p className={microLabel}>{L.quantity}</p>
        <div className="mt-3 inline-flex items-stretch border border-white/20">
          <button
            type="button"
            aria-label="Disminuir cantidad"
            disabled={soldOut || qty <= MIN_QTY}
            onClick={() => setQty((q) => Math.max(MIN_QTY, q - 1))}
            className="grid h-12 w-12 place-items-center font-condensed text-lg transition-colors duration-300 ease-out-expo hover:bg-dept-white hover:text-dept-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-dept-white"
          >
            <span aria-hidden>−</span>
          </button>
          <output
            aria-label="Cantidad"
            className="grid h-12 min-w-14 place-items-center border-x border-white/20 px-3 font-condensed text-sm tabular-nums"
          >
            {qty}
          </output>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={soldOut || qty >= MAX_QTY}
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            className="grid h-12 w-12 place-items-center font-condensed text-lg transition-colors duration-300 ease-out-expo hover:bg-dept-white hover:text-dept-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-dept-white"
          >
            <span aria-hidden>+</span>
          </button>
        </div>
      </div>

      {/* CTA */}
      <div ref={ctaRef} className="mt-8">
        <Button
          variant="red"
          size="lg"
          arrow={!soldOut}
          disabled={soldOut || busy}
          onClick={() => void handleAdd()}
          className="w-full"
          data-testid="add-to-cart-btn"
        >
          {soldOut ? L.soldOut : L.add}
        </Button>
      </div>

      {!soldOut && L.sticky && (
        <StickyAddToCart
          name={name}
          price={price}
          targetRef={ctaRef}
          hasSize={size !== null}
          addLabel={L.stickyAdd}
          chooseLabel={L.stickyChoose}
          onAction={() => void handleAdd()}
        />
      )}
    </div>
  );
}
