"use client";

import { useEffect, useRef, useState } from "react";

/**
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

type OpenMenu = "availability" | "price" | "sort" | null;

export function FilterBar({ count, value, onChange }: FilterBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLButtonElement>(null);
  const priceRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenu]);

  // Close menu on Escape
  useEffect(() => {
    if (!openMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        // Return focus to the trigger
        if (openMenu === "availability") availabilityRef.current?.focus();
        if (openMenu === "price") priceRef.current?.focus();
        if (openMenu === "sort") sortRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openMenu]);

  const handleSelectAvailability = (availability: Availability) => {
    onChange({ ...value, availability });
    setOpenMenu(null);
  };

  const handleSelectPrice = (sort: SortOrder) => {
    onChange({ ...value, sort });
    setOpenMenu(null);
  };

  const handleSelectSort = (sort: SortOrder) => {
    onChange({ ...value, sort });
    setOpenMenu(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-between border-y border-dept-gray-900 bg-dept-black px-6 py-3 font-condensed text-xs text-dept-white md:px-10"
    >
      {/* LEFT: Availability & Price dropdowns */}
      <div className="flex gap-6">
        {/* Availability */}
        <div className="relative">
          <button
            ref={availabilityRef}
            type="button"
            aria-expanded={openMenu === "availability"}
            aria-haspopup="true"
            onClick={() =>
              setOpenMenu(openMenu === "availability" ? null : "availability")
            }
            className="flex items-center gap-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
          >
            Availability <span className="text-xs">▾</span>
          </button>

          {openMenu === "availability" && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 min-w-[180px] border border-dept-gray-900 bg-dept-black"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.availability === "all"}
                onClick={() => handleSelectAvailability("all")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.availability === "all" && <span>✓ </span>}Todos
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.availability === "in-stock"}
                onClick={() => handleSelectAvailability("in-stock")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.availability === "in-stock" && <span>✓ </span>}En stock
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.availability === "sold-out"}
                onClick={() => handleSelectAvailability("sold-out")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.availability === "sold-out" && <span>✓ </span>}Agotado
              </button>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="relative">
          <button
            ref={priceRef}
            type="button"
            aria-expanded={openMenu === "price"}
            aria-haspopup="true"
            onClick={() => setOpenMenu(openMenu === "price" ? null : "price")}
            className="flex items-center gap-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
          >
            Price <span className="text-xs">▾</span>
          </button>

          {openMenu === "price" && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 min-w-[200px] border border-dept-gray-900 bg-dept-black"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.sort === "price-asc"}
                onClick={() => handleSelectPrice("price-asc")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.sort === "price-asc" && <span>✓ </span>}Precio: menor a
                mayor
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.sort === "price-desc"}
                onClick={() => handleSelectPrice("price-desc")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.sort === "price-desc" && <span>✓ </span>}Precio: mayor a
                menor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Item count & Sort dropdown */}
      <div className="flex items-center gap-6">
        <span>{count} artículos</span>

        <div className="relative">
          <button
            ref={sortRef}
            type="button"
            aria-expanded={openMenu === "sort"}
            aria-haspopup="true"
            onClick={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
            className="flex items-center gap-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
          >
            Ordenar <span className="text-xs">▾</span>
          </button>

          {openMenu === "sort" && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 min-w-[200px] border border-dept-gray-900 bg-dept-black"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.sort === "featured"}
                onClick={() => handleSelectSort("featured")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.sort === "featured" && <span>✓ </span>}Destacado
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.sort === "price-asc"}
                onClick={() => handleSelectSort("price-asc")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.sort === "price-asc" && <span>✓ </span>}Precio: menor a
                mayor
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value.sort === "price-desc"}
                onClick={() => handleSelectSort("price-desc")}
                className="block w-full px-4 py-2 text-left hover:bg-dept-gray-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-dept-white"
              >
                {value.sort === "price-desc" && <span>✓ </span>}Precio: mayor a
                menor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
