"use client";

/**
 * SCAFFOLD STUB — flesh out in `feature/filter-bar`.
 *
 * Filter/sort bar for the collection pages. Presentational + stateful for its
 * own dropdowns; the owning page holds `FilterState` and does the actual
 * filtering. API below is the contract other branches build against.
 */

export type Availability = "all" | "in-stock" | "sold-out";
export type SortOrder = "featured" | "price-asc" | "price-desc";

export interface FilterState {
  availability: Availability;
  sort: SortOrder;
}

export const DEFAULT_FILTER: FilterState = {
  availability: "all",
  sort: "featured",
};

interface FilterBarProps {
  /** number of items currently shown */
  count: number;
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterBar({ count, value, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center justify-between border-y border-dept-gray-900 px-6 py-3 md:px-10">
      <div className="font-condensed flex gap-6 text-xs text-dept-white">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              availability: value.availability === "all" ? "in-stock" : "all",
            })
          }
        >
          Availability
        </button>
        <button type="button">Price</button>
      </div>
      <div className="font-condensed flex items-center gap-6 text-xs text-dept-white">
        <span>{count} artículos</span>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              sort: value.sort === "featured" ? "price-asc" : "featured",
            })
          }
        >
          Ordenar
        </button>
      </div>
    </div>
  );
}
