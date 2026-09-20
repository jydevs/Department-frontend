import Link from "next/link";
import type { Product } from "@/data/types";
import { formatCOP } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { QuickAdd } from "./QuickAdd";

interface ProductCardProps {
  product: Product;
  /** `sizes` for the photo — pass the real column width for the slot */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Product card: photo (cross-fades to the second shot on hover), badge,
 * quick-add-by-size bar, then name + price. The whole card is one link
 * (stretched-link pattern) so the quick-add buttons stay valid HTML siblings.
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className,
}: ProductCardProps) {
  const soldOut = product.badge === "agotado";
  const onSale = product.badge === "oferta" && product.compareAtPrice != null;
  const [first, second] = product.images;

  return (
    <article className={clsx("group relative", className)}>
      <div className="relative overflow-hidden bg-dept-gray-900">
        <PlaceholderImage
          label={product.imageLabel}
          src={first}
          ratio="4 / 5"
          tone="dark"
          sizes={sizes}
          priority={priority}
          imgClassName={clsx(
            "transition-[transform,opacity] duration-700 ease-out-expo group-hover:scale-[1.04]",
            second && "group-hover:opacity-0",
            soldOut && "opacity-60 grayscale",
          )}
        />
        {second && (
          <PlaceholderImage
            label={`${product.imageLabel} — segunda vista`}
            src={second}
            fill
            sizes={sizes}
            imgClassName="scale-[1.04] opacity-0 transition-[transform,opacity] duration-700 ease-out-expo group-hover:scale-100 group-hover:opacity-100"
          />
        )}

        {product.badge && (
          <span
            className={clsx(
              "font-condensed absolute left-3 top-3 z-10 px-2.5 py-1 text-[10px] leading-none tracking-[0.2em]",
              soldOut ? "bg-dept-white text-dept-black" : "bg-dept-red text-dept-white",
            )}
          >
            {soldOut ? "Agotado" : "Oferta"}
          </span>
        )}

        {!soldOut && <QuickAdd product={product} />}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4 pb-1">
        <h3 className="font-condensed min-w-0 text-[13px] leading-snug tracking-[0.1em] text-dept-white">
          <Link
            href={`/products/${product.handle}`}
            className="link-underline after:absolute after:inset-0 after:z-10 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="font-condensed shrink-0 text-right text-[13px] leading-snug tracking-[0.06em] text-dept-white tabular-nums">
          {onSale && (
            <span className="mr-2 text-dept-gray-500 line-through">
              {formatCOP(product.compareAtPrice as number)}
            </span>
          )}
          <span className={clsx(onSale && "text-dept-red")}>{formatCOP(product.price)}</span>
        </p>
      </div>
    </article>
  );
}
