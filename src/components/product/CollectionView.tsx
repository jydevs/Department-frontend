"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog/types";
import { ProductGrid } from "./ProductGrid";
import { FilterBar, DEFAULT_FILTER, type FilterState } from "./FilterBar";
import { DEFAULT_GRID_LABELS, type GridLabels } from "./labels";

interface CollectionViewProps {
  id?: string;
  /** handle of the collection (for the "Ver más" requests) */
  handle?: string;
  /** first page of products */
  products: Product[];
  /** cursor of the next page; null / absent when the collection is already complete */
  nextCursor?: string | null;
  columns?: 3 | 4;
  showFilters?: boolean;
  /** visually hidden <h2> that names the list */
  srHeading?: string;
  labels?: GridLabels;
}

/**
 * Client wrapper that owns the filter/sort state and derives the visible products.
 * Filtering and sorting run in the browser over the pages loaded so far; "Ver más" fetches the next page
 * (through `/api/collections/:handle/products`) until the collection is complete.
 */
export function CollectionView({
  id,
  handle,
  products: initialProducts,
  nextCursor: initialCursor = null,
  columns = 4,
  showFilters = true,
  srHeading,
  labels = DEFAULT_GRID_LABELS,
}: CollectionViewProps) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cursor, setCursor] = useState<string | null>(handle ? initialCursor : null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const visible = useMemo(() => {
    let list = products;
    if (filter.availability === "in-stock") {
      list = list.filter((p) => p.badge !== "agotado");
    } else if (filter.availability === "sold-out") {
      list = list.filter((p) => p.badge === "agotado");
    }
    if (filter.sort === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (filter.sort === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, filter]);

  const loadMore = async () => {
    if (!handle || !cursor || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(handle)}/products?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { products?: Product[]; nextCursor?: string | null };
      const more = Array.isArray(body.products) ? body.products : [];
      setProducts((current) => {
        const seen = new Set(current.map((p) => p.handle));
        return [...current, ...more.filter((p) => !seen.has(p.handle))];
      });
      setCursor(typeof body.nextCursor === "string" ? body.nextCursor : null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={id} data-testid="collection-view" className="min-h-[50vh] w-full bg-dept-black pb-[var(--section-y)]">
      {srHeading && <h2 className="sr-only">{srHeading}</h2>}
      {showFilters && <FilterBar count={visible.length} value={filter} onChange={setFilter} labels={labels} />}
      <div className="pt-10 md:pt-14">
        <ProductGrid products={visible} columns={columns} priorityCount={4} labels={labels} />
      </div>
      {cursor && (
        <div className="px-gutter mt-14 flex flex-col items-center gap-3">
          <button
            type="button"
            data-testid="load-more"
            onClick={loadMore}
            disabled={loading}
            className="font-condensed border border-white/30 px-10 py-4 text-[12px] tracking-[0.24em] text-dept-white transition-colors duration-300 ease-out-expo hover:bg-dept-white hover:text-dept-black disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? labels.loadingMoreLabel : labels.loadMoreLabel}
          </button>
          {failed && (
            <p role="alert" className="font-condensed text-[11px] tracking-[0.2em] text-dept-red-light">
              {labels.loadMoreErrorLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
