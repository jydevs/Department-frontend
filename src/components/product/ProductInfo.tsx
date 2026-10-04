"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Product } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { useOverlay } from "@/components/layout/OverlayProvider";
import { useCart } from "@/lib/cart";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";
import { initialSelection, isSizeOption, missingOptions, needsChoice, onlyVariant, selectValue, selectedVariant, valueAvailable, type Selection } from "@/lib/variants";
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
  home: "Inicio", collection: "Tienda", collectionHandle: "all", size: "Talla", quantity: "Cantidad", max: 10, add: "Añadir al carrito", soldOut: "Agotado", sale: "Oferta",
  noPrice: "Precio no disponible", sizeRequired: "Selecciona una talla", stickyAdd: "Añadir", stickyChoose: "Elegir talla", showDiscount: true, sticky: true,
};

interface ProductInfoProps {
  product: Product;
  labels?: ProductDetailLabels;
}

/**
 * Product detail panel: breadcrumb, badge, name, price, blurb, option pickers (talla, color…),
 * quantity stepper and the add-to-cart CTA (+ the mobile sticky bar).
 * `lg:sticky` so it stays in view while the tall photo column scrolls.
 *
 * Con más de una variante NUNCA se elige una por el cliente: hay que elegir todas las opciones; las que estén
 * agotadas para la combinación elegida se deshabilitan.
 */
export function ProductInfo({ product, labels = DEFAULT_DETAIL_LABELS }: ProductInfoProps) {
  const L = labels;
  const MAX_QTY = L.max;
  const { handle, name, badge, description, options, variants } = product;

  const { add, busy, error: cartError } = useCart();
  const { openCart } = useOverlay();

  const [selection, setSelection] = useState<Selection>(() => initialSelection(product));
  const [qty, setQty] = useState(MIN_QTY);
  const [missing, setMissing] = useState<string | null>(null);
  /** el aviso del carrito solo se muestra si el intento de añadir se hizo desde esta ficha */
  const [attempted, setAttempted] = useState(false);

  const errorId = useId();
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement>(null);

  // variante elegida (selección completa) o la única que existe
  const variant = onlyVariant(product) ?? selectedVariant(product, selection);
  const soldOut = badge === "agotado" || (variant !== undefined && !variant.available);
  const allSoldOut = badge === "agotado";
  // precio de la variante elegida; sin elegir, el "desde" del producto (precio y precio anterior de la MISMA variante)
  const price = variant?.price ?? product.price;
  const compareAtPrice = variant ? variant.compareAtPrice : product.compareAtPrice;
  const priceVaries = !variant && new Set(variants.map((v) => v.price)).size > 1;
  const onSale = compareAtPrice != null && compareAtPrice > price;
  const discount = onSale && compareAtPrice != null ? Math.round((1 - price / compareAtPrice) * 100) : null;
  const shownBadge = allSoldOut ? "agotado" : variant && !variant.available ? "agotado" : onSale ? "oferta" : undefined;
  const visibleGroups = options.map((o, i) => ({ o, i })).filter(({ i }) => needsChoice(product, i));

  /* ── option pickers ──────────────────────────────────── */

  const choose = (optionIndex: number, value: string) => {
    setSelection((sel) => selectValue(product, sel, optionIndex, value));
    setMissing(null);
    setAttempted(false);
  };

  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>, optionIndex: number) => {
    if (allSoldOut) return;
    // navegación con flechas solo entre los valores que se pueden elegir
    const enabled = options[optionIndex].values.filter((v) => valueAvailable(product, selection, optionIndex, v));
    if (enabled.length === 0) return;
    const last = enabled.length - 1;
    const current = selection[optionIndex] ? enabled.indexOf(selection[optionIndex] as string) : -1;
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
    choose(optionIndex, enabled[next]);
    groupRefs.current[optionIndex]?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(enabled[next])}"]`)?.focus();
  };

  /* ── add to cart ─────────────────────────────────────── */

  /** Falta elegir: se avisa en línea, se agitan las opciones y se lleva el foco a la primera que falta. */
  const requireOptions = () => {
    const names = missingOptions(product, selection);
    setMissing(names.every(isSizeOption) ? L.sizeRequired : `Selecciona ${names.map((n) => n.toLowerCase()).join(" y ")}`);
    const firstMissing = options.findIndex((_, i) => needsChoice(product, i) && selection[i] === null);
    const group = groupRefs.current[firstMissing] ?? groupRefs.current.find(Boolean) ?? null;
    if (!group) return;
    group.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    group.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
    if (!prefersReducedMotion() && typeof group.animate === "function") {
      group.animate(SHAKE_KEYFRAMES, { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
  };

  const handleAdd = async () => {
    if (allSoldOut) return;
    if (!variant) return requireOptions();
    if (!variant.available) return;
    setMissing(null);
    setAttempted(true);
    if (await add(variant.id, qty, handle)) openCart();
  };

  const message = missing ?? (attempted ? cartError : null);

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
              {L.home}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/collections/${encodeURIComponent(L.collectionHandle)}`}
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
      {shownBadge && (
        <p
          className={clsx(
            "mt-8 inline-block px-2.5 py-1 font-condensed text-[11px] tracking-[0.2em]",
            shownBadge === "agotado"
              ? "border border-white/40 bg-dept-black text-dept-white"
              : "border border-dept-red bg-dept-red text-dept-white",
          )}
        >
          {shownBadge === "agotado" ? L.soldOut : L.sale}
        </p>
      )}
      <h1 className={clsx("font-display text-display-md text-balance", shownBadge ? "mt-4" : "mt-8")}>{name}</h1>

      {/* price */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-condensed text-2xl tabular-nums tracking-[0.04em] md:text-3xl">
          <span className="sr-only">Precio: </span>
          {priceVaries && price > 0 && <span className="mr-2 text-base text-dept-gray-300">Desde</span>}
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

      {/* opciones: una fila de chips por opción (Talla, Color…) */}
      <div className="mt-8 border-t border-white/10 pt-6">
        {visibleGroups.map(({ o, i }, g) => {
          const label = isSizeOption(o.name) ? L.size : o.name;
          const groupInvalid = missing !== null && selection[i] === null;
          return (
            <div key={o.name} className={g > 0 ? "mt-6" : undefined}>
              <p className={microLabel} id={`${errorId}-label-${i}`}>
                {label}
                {selection[i] && !isSizeOption(o.name) && <span className="ml-2 text-dept-white/70 normal-case tracking-normal">{selection[i]}</span>}
              </p>
              <div
                ref={(el) => {
                  groupRefs.current[i] = el;
                }}
                role="radiogroup"
                aria-labelledby={`${errorId}-label-${i}`}
                aria-required
                aria-invalid={groupInvalid || undefined}
                aria-describedby={errorId}
                aria-disabled={allSoldOut || undefined}
                onKeyDown={(e) => onGroupKeyDown(e, i)}
                className="mt-3 flex flex-wrap gap-2"
              >
                {o.values.map((value, vi) => {
                  const selected = selection[i] === value;
                  const available = valueAvailable(product, selection, i, value);
                  const firstEnabled = o.values.findIndex((v) => valueAvailable(product, selection, i, v));
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      data-testid={isSizeOption(o.name) ? "size-option" : "option-value"}
                      data-value={value}
                      aria-checked={selected}
                      disabled={allSoldOut || !available}
                      tabIndex={selected || (selection[i] === null && vi === firstEnabled) ? 0 : -1}
                      onClick={() => choose(i, value)}
                      className={clsx(
                        "h-12 min-w-12 border px-3 font-condensed text-sm tracking-[0.12em]",
                        "transition-[background-color,color,border-color] duration-300 ease-out-expo",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        !available && !allSoldOut && "line-through",
                        selected
                          ? "border-dept-white bg-dept-white text-dept-black"
                          : clsx(
                              "bg-transparent text-dept-white",
                              groupInvalid ? "border-dept-red" : "border-white/20",
                              available && !allSoldOut && "hover:border-dept-white",
                            ),
                      )}
                    >
                      {value}
                      {!available && !allSoldOut && <span className="sr-only"> (agotado)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* always mounted so the alert is announced when its text appears; reserved height = no layout shift */}
        <p id={errorId} role="alert" className="mt-2 min-h-5 font-body text-[13px] text-dept-red-light">
          {message}
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

      {!allSoldOut && L.sticky && (
        <StickyAddToCart
          name={name}
          price={price}
          targetRef={ctaRef}
          ready={variant !== undefined}
          message={message}
          addLabel={L.stickyAdd}
          chooseLabel={L.stickyChoose}
          onAction={() => void handleAdd()}
        />
      )}
    </div>
  );
}
