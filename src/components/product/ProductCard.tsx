import Link from "next/link";
import type { Product } from "@/data/types";
import { formatCOP } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

interface ProductCardProps {
  product: Product;
  className?: string;
}

/**
 * Product card: image, name, price, and optional badge.
 * Server component. No client interactivity.
 */
export function ProductCard({ product, className }: ProductCardProps) {
  const badgeLabel = product.badge === "agotado" ? "Agotado" : "Oferta";
  const hasBadge = !!product.badge;
  const hasDiscount = !!product.compareAtPrice;

  return (
    <Link
      href={`/products/${product.handle}`}
      aria-label={`${product.name} — ${formatCOP(product.price)}`}
      className={clsx(
        "group relative flex flex-col bg-dept-black text-dept-white no-underline",
        "transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-dept-white",
        className,
      )}
    >
      {/* Image */}
      <div className="overflow-hidden transition-opacity duration-200 group-hover:opacity-90">
        <PlaceholderImage
          label={product.imageLabel}
          ratio="4 / 5"
          tone="dark"
        />
      </div>

      {/* Badge (if present) */}
      {hasBadge && (
        <div
          className={clsx(
            "absolute top-2 left-2 font-condensed uppercase px-2 py-px text-[10px] tracking-wider",
            product.badge === "agotado"
              ? "bg-dept-black text-dept-white"
              : "bg-dept-red text-dept-white",
          )}
        >
          {badgeLabel}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="border-t border-white/15 px-3 py-2.5 flex flex-row justify-between items-start gap-3">
        {/* Name (left) */}
        <span className="font-condensed text-[12px] leading-tight text-dept-white flex-1">
          {product.name}
        </span>

        {/* Price (right) */}
        <div className="font-condensed text-[12px] text-dept-white whitespace-nowrap text-right">
          <div>{formatCOP(product.price)}</div>
          {hasDiscount && (
            <div className="line-through text-dept-gray-500">
              {formatCOP(product.compareAtPrice)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
