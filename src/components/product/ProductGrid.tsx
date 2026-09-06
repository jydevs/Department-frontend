import type { Product } from "@/data/types";
import { clsx } from "@/lib/clsx";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  className?: string;
}

/**
 * Responsive grid of product cards.
 * Server component. No client interactivity.
 *
 * Breakpoints:
 * - 2 columns on mobile
 * - 3 columns on sm/md
 * - 4 columns on lg+
 */
export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <span className="font-condensed text-dept-gray-500">
          No hay artículos.
        </span>
      </div>
    );
  }

  return (
    <ul
      className={clsx(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-white/10",
        className,
      )}
    >
      {products.map((product) => (
        <li key={product.handle} className="bg-dept-black">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
