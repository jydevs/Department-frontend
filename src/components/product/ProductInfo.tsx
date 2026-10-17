"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Product, ProductVariant } from "@/lib/catalog/types";
import { Button } from "@/components/ui/Button";
import { useOverlay } from "@/components/layout/OverlayProvider";
import { useCart } from "@/lib/cart";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";
import { StickyAddToCart } from "./StickyAddToCart";
import { DEFAULT_PRODUCT_DETAIL, type ProductDetailSettings } from "./detail-config";

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

interface ProductInfoProps {
  product: Product;
  settings?: ProductDetailSettings;
}

/**
 * Product detail panel: breadcrumb, badge, name, price, blurb, size picker,
 * quantity stepper and the add-to-cart CTA (+ the mobile sticky bar).
 * `lg:sticky` so it stays in view while the tall photo column scrolls.
 */
export function ProductInfo({ product, settings = DEFAULT_PRODUCT_DETAIL }: ProductInfoProps) {
  const { handle, name, variants, needsSize } = product;
  const maxQty = Math.max(1, settings.maxQuantity);
  const soldOut = !product.available;

  const { add } = useCart();
  const { openCart } = useOverlay();

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(MIN_QTY);
  const [showError, setShowError] = useState(false);

  const errorId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement>(null);

  const selected: ProductVariant | null = variants.find((v) => v.id === variantId) ?? null;
  // single-variant products have nothing to pick: that variant is the selection
  const effective: ProductVariant | null = selected ?? (!needsSize ? (variants[0] ?? null) : null);
  const price = effective?.price ?? product.price;
  const compareAtPrice = effective ? effective.compareAtPrice : product.compareAtPrice;
  const badge = soldOut ? "agotado" : compareAtPrice != null && compareAtPrice > price ? "oferta" : undefined;

  const discount =
    compareAtPrice != null && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : null;

  /* ── size picker ─────────────────────────────────────── */

  const selectVariant = (next: ProductVariant) => {
    setVariantId(next.id);
    setShowError(false);
  };

  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (soldOut) return;
    const enabled = variants.map((v, i) => (v.available ? i : -1)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const currentIdx = selected ? variants.indexOf(selected) : -1;
    const pos = enabled.indexOf(currentIdx);
    let nextIdx: number;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIdx = enabled[pos < 0 || pos >= enabled.length - 1 ? 0 : pos + 1];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIdx = enabled[pos <= 0 ? enabled.length - 1 : pos - 1];
        break;
      case "Home":
        nextIdx = enabled[0];
        break;
      case "End":
        nextIdx = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    selectVariant(variants[nextIdx]);
    chipRefs.current[nextIdx]?.focus();
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

  const handleAdd = () => {
    if (soldOut) return;
    // no size chosen yet: take the first variant that can be bought (same as the original storefront)
    const chosen = effective ?? variants.find((v) => v.available) ?? null;
    if (!chosen) {
      requireSize();
      return;
    }
    if (!selected && needsSize) setVariantId(chosen.id);
    const added = add(
      {
        variantId: chosen.id,
        handle,
        size: chosen.label,
        name,
        price: chosen.price,
        image: product.images[0],
        imageAlt: product.imageLabel,
        max: maxQty,
      },
      qty,
    );
    if (added) openCart();
  };

  const hasCollectionCrumb = settings.breadcrumbCollectionLabel.length > 0;

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
              {settings.breadcrumbHomeLabel}
              {settings.breadcrumbHomeLabel === "Inicio" && <span className="sr-only"> Home</span>}
            </Link>
          </li>
          {hasCollectionCrumb && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/collections/${settings.breadcrumbCollectionHandle}`}
                  className="transition-colors duration-300 ease-out-expo hover:text-dept-white"
                >
                  {settings.breadcrumbCollectionLabel}
                </Link>
              </li>
            </>
          )}
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
          {badge === "agotado" ? settings.soldOutLabel : settings.saleBadgeLabel}
        </p>
      )}
      <h1 className={clsx("font-display text-display-md text-balance", badge ? "mt-4" : "mt-8")}>{name}</h1>

      {/* price */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-condensed text-2xl tabular-nums tracking-[0.04em] md:text-3xl">
          <span className="sr-only">Precio: </span>
          <span data-testid="product-price">{price && price > 0 ? formatCOP(price) : settings.noPriceLabel}</span>
        </p>
        {discount != null && compareAtPrice != null && (
          <>
            <p className="font-condensed text-base tabular-nums text-dept-gray-500 line-through">
              <span className="sr-only">Precio anterior: </span>
              {formatCOP(compareAtPrice)}
            </p>
            {settings.showDiscountBadge && (
              <p className="bg-dept-red px-2 py-0.5 font-condensed text-[11px] tabular-nums tracking-[0.12em] text-dept-white">
                <span className="sr-only">Descuento </span>-{discount}%
              </p>
            )}
          </>
        )}
      </div>

      {product.descriptionHtml ? (
        <div
          className="mt-6 max-w-prose font-body text-sm leading-relaxed text-white/70 md:text-base [&_a]:underline [&_h2]:mt-6 [&_h2]:font-display [&_h3]:mt-6 [&_h3]:font-display [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-4 [&_strong]:text-dept-white [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
          // sanitised twice: by the API and by lib/catalog/html.ts (whitelist of tags, no attributes except a safe href)
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ) : product.description ? (
        <p className="mt-6 max-w-prose font-body text-sm leading-relaxed text-white/70 md:text-base">
          {product.description}
        </p>
      ) : null}

      {/* size */}
      {needsSize && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className={microLabel}>{settings.sizeLabel}</p>
          <div
            ref={groupRef}
            role="radiogroup"
            aria-label={settings.sizeLabel}
            aria-required
            aria-invalid={showError}
            aria-describedby={errorId}
            aria-disabled={soldOut || undefined}
            onKeyDown={onGroupKeyDown}
            className="mt-3 flex flex-wrap gap-2"
          >
            {variants.map((v, i) => {
              const isSelected = selected?.id === v.id;
              const firstEnabled = variants.findIndex((x) => x.available);
              return (
                <button
                  key={v.id}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  data-testid="size-option"
                  aria-checked={isSelected}
                  disabled={soldOut || !v.available}
                  tabIndex={isSelected || (selected === null && i === firstEnabled) ? 0 : -1}
                  onClick={() => selectVariant(v)}
                  className={clsx(
                    "h-12 min-w-12 border px-3 font-condensed text-sm tracking-[0.12em]",
                    "transition-[background-color,color,border-color] duration-300 ease-out-expo",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    !v.available && !soldOut && "line-through",
                    isSelected
                      ? "border-dept-white bg-dept-white text-dept-black"
                      : clsx(
                          "bg-transparent text-dept-white",
                          showError ? "border-dept-red" : "border-white/20",
                          !soldOut && v.available && "hover:border-dept-white",
                        ),
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          {/* always mounted so the alert is announced when its text appears; reserved height = no layout shift */}
          <p id={errorId} role="alert" className="mt-2 min-h-5 font-body text-[13px] text-dept-red-light">
            {showError ? settings.sizeRequiredMessage : null}
          </p>
        </div>
      )}

      {/* quantity */}
      <div className="mt-4">
        <p className={microLabel}>{settings.quantityLabel}</p>
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
            aria-label={settings.quantityLabel}
            className="grid h-12 min-w-14 place-items-center border-x border-white/20 px-3 font-condensed text-sm tabular-nums"
          >
            {qty}
          </output>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={soldOut || qty >= maxQty}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="grid h-12 w-12 place-items-center font-condensed text-lg transition-colors duration-300 ease-out-expo hover:bg-dept-white hover:text-dept-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-dept-white"
          >
            <span aria-hidden>+</span>
          </button>
        </div>
      </div>

      {/* public metafields (e.g. composition, care) */}
      {product.metafields.length > 0 && (
        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm">
          {product.metafields.map((m) => (
            <div key={m.key} className="contents">
              <dt className={microLabel}>{m.key.replace(/[_-]+/g, " ")}</dt>
              <dd className="text-white/70">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* CTA */}
      <div ref={ctaRef} className="mt-8">
        <Button
          variant="red"
          size="lg"
          arrow={!soldOut}
          disabled={soldOut}
          onClick={() => handleAdd()}
          className="w-full"
          data-testid="add-to-cart-btn"
        >
          {soldOut ? settings.soldOutLabel : settings.addToCartLabel}
        </Button>
      </div>

      {!soldOut && settings.stickyAddToCart && (
        <StickyAddToCart
          name={name}
          price={price}
          targetRef={ctaRef}
          hasSize={!needsSize || selected !== null}
          onAction={() => handleAdd()}
          addLabel={settings.stickyAddLabel}
          chooseSizeLabel={settings.stickyChooseSizeLabel}
        />
      )}
    </div>
  );
}
