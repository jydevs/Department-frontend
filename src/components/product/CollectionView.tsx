"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/types";
import { ProductGrid, type GridLabels } from "./ProductGrid";
import { FilterBar, DEFAULT_FILTER, DEFAULT_FILTER_LABELS, type FilterLabels, type FilterState } from "./FilterBar";

/**
 * Wrapper cliente que guarda el estado de filtros/orden y deriva los productos visibles.
 * La disponibilidad sale de las variantes reales (API); el orden "destacado" conserva el de la colección.
 */
export function CollectionView({
  products,
  columns = 4,
  showFilters = true,
  srHeading = "Productos",
  filterLabels = DEFAULT_FILTER_LABELS,
  gridLabels,
}: {
  products: Product[];
  columns?: 3 | 4;
  showFilters?: boolean;
  srHeading?: string;
  filterLabels?: FilterLabels;
  gridLabels?: GridLabels;
}) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const visible = useMemo(() => {
    let list = products;
    if (filter.availability === "in-stock") list = list.filter((p) => p.badge !== "agotado");
    else if (filter.availability === "sold-out") list = list.filter((p) => p.badge === "agotado");
    if (filter.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (filter.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, filter]);

  return (
    <div data-testid="collection-view" className="min-h-[50vh] w-full bg-dept-black pb-[var(--section-y)]">
      <h2 className="sr-only">{srHeading}</h2>
      {showFilters && <FilterBar count={visible.length} value={filter} onChange={setFilter} labels={filterLabels} />}
      <div className="pt-10 md:pt-14">
        <ProductGrid products={visible} columns={columns} priorityCount={4} labels={gridLabels} />
      </div>
    </div>
  );
}
