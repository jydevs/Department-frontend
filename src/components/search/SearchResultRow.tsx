"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/types";
import { formatCOP } from "@/lib/format";
import { clsx } from "@/lib/clsx";

interface SearchResultRowProps {
  product: Product;
  /** DOM id — referenced by the combobox's `aria-activedescendant` */
  id: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}

/**
 * One product in the search listbox. The link carries `role="option"` so the
 * input (role="combobox") can point at it with `aria-activedescendant`; it is
 * kept out of the Tab order (arrow keys drive the list, Tab moves on).
 */
export function SearchResultRow({ product, id, active, onHover, onSelect }: SearchResultRowProps) {
  const soldOut = product.badge === "agotado";
  const onSale = product.badge === "oferta";

  return (
    <li role="presentation" className="border-b border-white/10">
      <Link
        id={id}
        role="option"
        data-testid="search-result"
        aria-selected={active}
        tabIndex={-1}
        href={`/products/${product.handle}`}
        onClick={onSelect}
        onMouseMove={onHover}
        className={clsx(
          "group flex items-center gap-5 px-3 py-4 text-dept-white",
          "transition-colors duration-200 ease-out-expo",
          active
            ? "bg-white/[0.06] shadow-[inset_2px_0_0_var(--dept-red)]"
            : "shadow-[inset_2px_0_0_transparent]",
        )}
      >
        <span className="relative block h-24 w-[72px] shrink-0 overflow-hidden bg-dept-gray-900">
          <Image
            src={product.images[0]}
            alt=""
            fill
            sizes="72px"
            className={clsx(
              "object-cover transition-transform duration-500 ease-out-expo",
              active && "scale-[1.05]",
              soldOut && "opacity-60",
            )}
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span
            className={clsx(
              "font-condensed text-lg leading-tight tracking-[0.06em] transition-colors",
              soldOut && "text-dept-gray-300",
            )}
          >
            {product.name}
          </span>

          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm tabular-nums">
            <span className={soldOut ? "text-dept-gray-500" : "text-dept-white"}>
              {formatCOP(product.price)}
            </span>
            {product.compareAtPrice !== undefined && (
              <span className="text-dept-gray-500 line-through">
                <span className="sr-only">Precio anterior </span>
                {formatCOP(product.compareAtPrice)}
              </span>
            )}
            {onSale && (
              <span className="bg-dept-red px-1.5 py-px font-condensed text-[10px] leading-4 tracking-[0.2em] text-dept-white">
                OFERTA
              </span>
            )}
            {soldOut && (
              <span className="border border-white/20 px-1.5 py-px font-condensed text-[10px] leading-4 tracking-[0.2em] text-dept-gray-500">
                AGOTADO
              </span>
            )}
          </span>
        </span>

        <span
          aria-hidden
          className={clsx(
            "shrink-0 font-condensed text-xl text-dept-red-light transition-[opacity,transform] duration-300 ease-out-expo",
            active ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
          )}
        >
          →
        </span>
      </Link>
    </li>
  );
}
