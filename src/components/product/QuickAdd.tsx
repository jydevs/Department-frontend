"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/data/types";
import { useCart } from "@/lib/cart";
import { clsx } from "@/lib/clsx";
import { variantLabel } from "@/lib/variants";
import { useOverlay } from "@/components/layout/OverlayProvider";

/**
 * Hover / focus "add by size" bar that slides up over a product card image.
 * Hidden on touch devices (Tailwind's `hover:` only applies on hover-capable
 * pointers) — there the whole card is just a link to the product page.
 *
 * - Una sola opción (talla): un botón por variante; las agotadas quedan deshabilitadas.
 * - Varias opciones (color × talla…): no se adivina nada, se envía a la ficha para elegir.
 * - Los errores del carrito (sin stock, límite…) se muestran en la propia tarjeta y se limpian solos.
 */
export function QuickAdd({ product }: { product: Product }) {
  const { add, busy, error } = useCart();
  const { openCart } = useOverlay();
  /** este botón fue el último en intentar añadir (el error del carrito es global) */
  const [attempted, setAttempted] = useState(false);
  const message = attempted && error ? error : null;

  // el aviso desaparece solo
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setAttempted(false), 6000);
    return () => clearTimeout(t);
  }, [message]);

  if (product.variants.length === 0) return null;

  /** una sola variante (producto sin opciones reales): un único botón "Añadir" */
  const single = product.variants.length === 1;
  const multi = product.options.filter((o) => o.values.length > 1).length > 1;

  const onAdd = async (variantId: string) => {
    setAttempted(true);
    if (await add(variantId, 1, product.handle)) {
      setAttempted(false);
      openCart();
    }
  };

  return (
    <div
      className={clsx(
        "absolute inset-x-0 bottom-0 z-20 bg-dept-black/85 p-2.5 backdrop-blur-md transition-transform duration-500 ease-out-expo group-focus-within:translate-y-0 group-hover:translate-y-0 max-md:hidden",
        message ? "translate-y-0" : "translate-y-full",
      )}
      role="group"
      aria-label={`Añadir ${product.name} al carrito`}
      onMouseLeave={() => setAttempted(false)}
    >
      <p className="font-condensed mb-2 text-[10px] tracking-[0.24em] text-dept-gray-300">Añadir rápido</p>
      {multi ? (
        <Link
          href={`/products/${product.handle}`}
          className="font-condensed block bg-dept-black py-2.5 text-center text-xs tracking-[0.12em] text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black focus-visible:bg-dept-white focus-visible:text-dept-black"
        >
          Elegir opciones
        </Link>
      ) : (
        <div className="grid gap-px bg-white/15" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(6, product.variants.length))}, minmax(0, 1fr))` }}>
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.available || busy}
              onClick={() => void onAdd(v.id)}
              className="font-condensed bg-dept-black py-2.5 text-xs tracking-[0.12em] text-dept-white transition-colors duration-200 hover:bg-dept-white hover:text-dept-black focus-visible:bg-dept-white focus-visible:text-dept-black disabled:opacity-30 disabled:hover:bg-dept-black disabled:hover:text-dept-white"
              aria-label={`${single ? "Añadir al carrito" : `${product.options[0]?.name ?? "Opción"} ${variantLabel(v)}`}${v.available ? "" : " (agotado)"}`}
            >
              {single ? "Añadir" : variantLabel(v)}
            </button>
          ))}
        </div>
      )}
      {/* siempre montado para que el aviso se anuncie al aparecer; sin altura mientras está vacío */}
      <p role="alert" className={clsx("font-body text-[11px] leading-snug text-dept-red-light", message && "mt-2")}>
        {message}
      </p>
    </div>
  );
}
