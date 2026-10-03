"use client";

import type { Product } from "@/data/types";
import { useCart } from "@/lib/cart";
import { useOverlay } from "@/components/layout/OverlayProvider";

/**
 * Hover / focus "add by size" bar that slides up over a product card image.
 * Hidden on touch devices (Tailwind's `hover:` only applies on hover-capable
 * pointers) — there the whole card is just a link to the product page.
 */
export function QuickAdd({ product }: { product: Product }) {
  const { add } = useCart();
  const { openCart } = useOverlay();

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-dept-black/85 p-2.5 backdrop-blur-md transition-transform duration-500 ease-out-expo group-focus-within:translate-y-0 group-hover:translate-y-0 max-md:hidden"
      role="group"
      aria-label={`Añadir ${product.name} al carrito`}
    >
      <p className="font-condensed mb-2 text-[10px] tracking-[0.24em] text-dept-gray-300">
        Añadir rápido
      </p>
      <div className="grid gap-px bg-white/15" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(6, product.variants.length))}, minmax(0, 1fr))` }}>
        {product.variants.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={!v.available}
            onClick={async () => {
              if (await add(v.id, 1, product.handle)) openCart();
            }}
            className="font-condensed bg-dept-black py-2.5 text-xs tracking-[0.12em] text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black focus-visible:bg-dept-white focus-visible:text-dept-black disabled:opacity-30 disabled:hover:bg-dept-black disabled:hover:text-dept-white"
            aria-label={`Talla ${v.size}`}
          >
            {v.size}
          </button>
        ))}
      </div>
    </div>
  );
}
