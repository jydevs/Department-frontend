"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/types";
import { ProductGrid } from "./ProductGrid";
import { FilterBar, DEFAULT_FILTER, type FilterState } from "./FilterBar";

/**
 * SCAFFOLD STUB — flesh out alongside `feature/filter-bar` / `feature/collection-page`.
 * Client wrapper that owns the filter/sort state and derives the visible products.
 */
export function CollectionView({ products }: { products: Product[] }) {
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
    <div>
      <FilterBar count={visible.length} value={filter} onChange={setFilter} />
      <ProductGrid products={visible} />
    </div>
  );
}
