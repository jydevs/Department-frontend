"use client";

import type { Product } from "@/lib/catalog/types";
import { useCart } from "@/lib/cart";
import { useOverlay } from "@/components/layout/OverlayProvider";

/**
 * Hover / focus "add by size" bar that slides up over a product card image.
 * Hidden on touch devices (Tailwind's `hover:` only applies on hover-capable
 * pointers) — there the whole card is just a link to the product page.
 * Each chip is a real API variant; sold-out variants are disabled.
 */
export function QuickAdd({ product, label = "Añadir rápido" }: { product: Product; label?: string }) {
  const { add } = useCart();
  const { openCart } = useOverlay();

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-dept-black/85 p-2.5 backdrop-blur-md transition-transform duration-500 ease-out-expo group-focus-within:translate-y-0 group-hover:translate-y-0 max-md:hidden"
      role="group"
      aria-label={`Añadir ${product.name} al carrito`}
    >
      <p className="font-condensed mb-2 text-[10px] tracking-[0.24em] text-dept-gray-300">{label}</p>
      <div className="grid grid-cols-4 gap-px bg-white/15">
        {product.variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            disabled={!variant.available}
            onClick={() => {
              const added = add(
                {
                  variantId: variant.id,
                  handle: product.handle,
                  size: variant.label,
                  name: product.name,
                  price: variant.price,
                  image: product.images[0],
                  imageAlt: product.imageLabel,
                },
                1,
              );
              if (added) openCart();
            }}
            className="font-condensed bg-dept-black py-2.5 text-xs tracking-[0.12em] text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black focus-visible:bg-dept-white focus-visible:text-dept-black disabled:cursor-not-allowed disabled:text-dept-gray-500 disabled:line-through disabled:hover:bg-dept-black disabled:hover:text-dept-gray-500"
            aria-label={variant.available ? `Talla ${variant.label}` : `Talla ${variant.label} (agotada)`}
          >
            {variant.label}
          </button>
        ))}
      </div>
    </div>
  );
}
