"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog/types";
import { ProductGrid } from "./ProductGrid";
import { FilterBar, DEFAULT_FILTER, type FilterState } from "./FilterBar";
import { DEFAULT_GRID_LABELS, type GridLabels } from "./labels";

interface CollectionViewProps {
  id?: string;
  products: Product[];
  columns?: 3 | 4;
  showFilters?: boolean;
  /** visually hidden <h2> that names the list */
  srHeading?: string;
  labels?: GridLabels;
}

/**
 * Client wrapper that owns the filter/sort state and derives the visible products.
 * The filtering itself is done in the browser over the (already fetched) collection.
 */
export function CollectionView({
  id,
  products,
  columns = 4,
  showFilters = true,
  srHeading,
  labels = DEFAULT_GRID_LABELS,
}: CollectionViewProps) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

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

  return (
    <div id={id} data-testid="collection-view" className="min-h-[50vh] w-full bg-dept-black pb-[var(--section-y)]">
      {srHeading && <h2 className="sr-only">{srHeading}</h2>}
      {showFilters && <FilterBar count={visible.length} value={filter} onChange={setFilter} labels={labels} />}
      <div className="pt-10 md:pt-14">
        <ProductGrid products={visible} columns={columns} priorityCount={4} labels={labels} />
      </div>
    </div>
  );
}
