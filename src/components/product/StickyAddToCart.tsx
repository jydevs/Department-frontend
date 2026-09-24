"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { formatCOP } from "@/lib/format";
import { clsx } from "@/lib/clsx";

interface StickyAddToCartProps {
  name: string;
  price: number;
  /** the main CTA block; the bar shows while it is below the fold */
  targetRef: RefObject<HTMLElement | null>;
  /** a size is already chosen → the action adds to cart instead of asking for one */
  hasSize: boolean;
  onAction: () => void;
}

/** Height of the bar (content only), so the CTA counts as "hidden" while it sits under it. */
const BAR_OFFSET_PX = 72;

/**
 * Fixed bottom bar, below `lg` only. Visible while the main "Añadir al carrito"
 * is still BELOW the viewport; once the user reaches it (or scrolls past it,
 * towards the related products / footer) the bar slides away so it never
 * covers the rest of the page.
 */
export function StickyAddToCart({ name, price, targetRef, hasSize, onAction }: StickyAddToCartProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // out of view AND still ahead of the user (below the viewport)
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top > 0);
      },
      { rootMargin: `0px 0px -${BAR_OFFSET_PX}px 0px` },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetRef]);

  return (
    <div
      // `inert` while hidden: not focusable, not announced
      inert={!visible}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-dept-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden",
        "transition-transform duration-500 ease-out-expo",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="px-gutter flex items-center gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-condensed text-xs leading-tight tracking-[0.08em] text-dept-white">
            {name}
          </p>
          <p className="mt-0.5 font-condensed text-xs tabular-nums text-white/70">{formatCOP(price)}</p>
        </div>
        <Button variant="red" size="md" onClick={onAction} className="shrink-0">
          {hasSize ? "Añadir" : "Elegir talla"}
        </Button>
      </div>
    </div>
  );
}
