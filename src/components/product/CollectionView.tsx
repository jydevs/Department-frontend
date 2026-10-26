"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/types";
import { apiFetch } from "@/lib/api/client";
import { friendlyError } from "@/lib/api/errors";
import { fromSummary } from "@/lib/api/map";
import type { ApiCollectionPage } from "@/lib/api/types";
import { ProductGrid, type GridLabels } from "./ProductGrid";
import { FilterBar, DEFAULT_FILTER, DEFAULT_FILTER_LABELS, type FilterLabels, type FilterState } from "./FilterBar";

/** Piezas que se piden en cada "Cargar más". */
const MORE_PAGE_SIZE = 48;

/**
 * Wrapper cliente que guarda el estado de filtros/orden y deriva los productos visibles.
 * La disponibilidad sale de las variantes reales (API); el orden "destacado" conserva el de la colección.
 * Si la colección tiene más piezas que las cargadas (`hasMore`) avisa y permite cargar el resto por páginas.
 */
export function CollectionView({
  products,
  columns = 4,
  showFilters = true,
  srHeading = "Productos",
  filterLabels = DEFAULT_FILTER_LABELS,
  gridLabels,
  collectionHandle,
  hasMore = false,
  nextCursor = null,
}: {
  products: Product[];
  columns?: 3 | 4;
  showFilters?: boolean;
  srHeading?: string;
  filterLabels?: FilterLabels;
  gridLabels?: GridLabels;
  /** colección de la que se pueden cargar más piezas */
  collectionHandle?: string;
  hasMore?: boolean;
  nextCursor?: string | null;
}) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [extra, setExtra] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [more, setMore] = useState(hasMore && !!nextCursor && !!collectionHandle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => {
    const seen = new Set(products.map((p) => p.handle));
    return [...products, ...extra.filter((p) => !seen.has(p.handle))];
  }, [products, extra]);

  const visible = useMemo(() => {
    let list = all;
    if (filter.availability === "in-stock") list = list.filter((p) => p.badge !== "agotado");
    else if (filter.availability === "sold-out") list = list.filter((p) => p.badge === "agotado");
    if (filter.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (filter.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [all, filter]);

  const filtered = filter.availability !== "all" || filter.sort !== "featured";

  const loadMore = async () => {
    if (!collectionHandle || !cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<ApiCollectionPage>(`/storefront/collections/${encodeURIComponent(collectionHandle)}`, { query: { limit: MORE_PAGE_SIZE, cursor } });
      setExtra((prev) => [...prev, ...page.products.items.map(fromSummary)]);
      setCursor(page.products.nextCursor);
      setMore(page.products.hasMore && !!page.products.nextCursor);
    } catch (e) {
      setError(friendlyError(e, "No se pudieron cargar más piezas. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="collection-view" className="min-h-[50vh] w-full bg-dept-black pb-[var(--section-y)]">
      <h2 className="sr-only">{srHeading}</h2>
      {showFilters && <FilterBar count={visible.length} value={filter} onChange={setFilter} labels={filterLabels} />}
      <div className="pt-10 md:pt-14">
        <ProductGrid products={visible} columns={columns} labels={gridLabels} onReset={filtered ? () => setFilter(DEFAULT_FILTER) : undefined} resetLabel={filterLabels.reset} />
      </div>

      {more && (
        <div className="px-gutter mt-14 flex flex-col items-center gap-4 text-center" data-testid="load-more">
          <p className="font-condensed text-[11px] tracking-[0.22em] text-dept-gray-300" role="status">
            Mostrando {all.length} piezas. La colección tiene más.{filtered ? " Los filtros y el orden solo afectan a las piezas cargadas." : ""}
          </p>
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="font-condensed inline-flex h-12 items-center border border-white/30 px-8 text-xs tracking-[0.16em] text-dept-white transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Cargando…" : "Cargar más piezas"}
          </button>
          {error && (
            <p role="alert" className="font-body text-[13px] text-dept-red-light">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
