import type { Product } from "@/data/types";
import { clsx } from "@/lib/clsx";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "./ProductCard";

export interface GridLabels { emptyTitle: string; emptyText: string; soldOut: string; sale: string }

interface ProductGridProps {
  labels?: GridLabels;
  products: Product[];
  className?: string;
  columns?: 3 | 4;
  /** how many leading cards should load eagerly (above-the-fold grids) */
  priorityCount?: number;
  /** estado vacío por filtros: botón para volver a ver todo */
  onReset?: () => void;
  resetLabel?: string;
}

/**
 * Responsive product grid, padded to the page gutter. Cards fade in on scroll,
 * staggered per column.
 *
 * columns = 4 (default): 2 / 3 / 4 columns (mobile / sm / lg)
 * columns = 3:           2 / 2 / 3 columns
 */
export function ProductGrid({ products, className, columns = 4, priorityCount = 0, labels, onReset, resetLabel = "Limpiar filtros" }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="px-gutter py-24 text-center" data-testid="empty-grid">
        <p className="font-display text-display-md text-dept-white">{labels?.emptyTitle ?? "Sin resultados"}</p>
        <p className="font-condensed mt-3 text-[11px] tracking-[0.22em] text-dept-gray-300">
          {labels?.emptyText ?? "Prueba con otro filtro"}
        </p>
        {onReset && (
          <button
            type="button"
            data-testid="reset-filters"
            onClick={onReset}
            className="font-condensed mt-8 inline-flex h-11 items-center border border-white/30 px-6 text-xs tracking-[0.16em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black"
          >
            {resetLabel}
          </button>
        )}
      </div>
    );
  }

  const cols = columns === 3 ? 3 : 4;
  const gridClasses =
    columns === 3
      ? "grid-cols-2 lg:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  const sizes =
    columns === 3
      ? "(min-width: 1024px) 33vw, 50vw"
      : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  return (
    <ul
      data-testid="product-grid"
      className={clsx(
        "grid gap-x-3 gap-y-12 px-gutter md:gap-x-4 md:gap-y-16",
        gridClasses,
        className,
      )}
    >
      {products.map((product, i) => (
        <Reveal as="li" key={product.handle} delay={(i % cols) * 90}>
          <ProductCard product={product} sizes={sizes} priority={i < priorityCount} badgeLabels={labels} />
        </Reveal>
      ))}
    </ul>
  );
}
