"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

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

type MenuId = "availability" | "price" | "sort";

interface Option<T extends string> {
  value: T;
  label: string;
}

const AVAILABILITY: Option<Availability>[] = [
  { value: "all", label: "Todos" },
  { value: "in-stock", label: "En stock" },
  { value: "sold-out", label: "Agotado" },
];

const PRICE: Option<SortOrder>[] = [
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

const SORT: Option<SortOrder>[] = [
  { value: "featured", label: "Destacado" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={clsx("transition-transform duration-300 ease-out-expo", open && "rotate-180")}
    >
      <path d="M1 3.5l4 4 4-4" />
    </svg>
  );
}

interface DropdownProps<T extends string> {
  id: MenuId;
  label: string;
  options: Option<T>[];
  selected: T | null;
  openMenu: MenuId | null;
  setOpenMenu: (id: MenuId | null) => void;
  onSelect: (value: T) => void;
  align?: "left" | "right";
  /** highlight the trigger while a non-default option is active */
  active?: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function Dropdown<T extends string>({
  id,
  label,
  options,
  selected,
  openMenu,
  setOpenMenu,
  onSelect,
  align = "left",
  active = false,
  triggerRef,
}: DropdownProps<T>) {
  const open = openMenu === id;
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpenMenu(open ? null : id)}
        className={clsx(
          "flex items-center gap-2 py-1.5 transition-colors duration-200 hover:text-dept-red",
          active ? "text-dept-white" : "text-dept-white/80",
        )}
      >
        {label}
        {active && <span aria-hidden className="h-1.5 w-1.5 bg-dept-red" />}
        <Caret open={open} />
      </button>

      {open && (
        <div
          role="menu"
          style={{ animation: "fade-up 0.35s var(--ease-out-expo) both" }}
          className={clsx(
            "absolute top-full z-30 mt-3 min-w-[15rem] border border-white/15 bg-dept-black/95 backdrop-blur-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => {
            const checked = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => onSelect(option.value)}
                className="flex w-full items-center justify-between gap-6 px-4 py-3 text-left text-[11px] tracking-[0.18em] transition-colors duration-200 hover:bg-dept-white hover:text-dept-black focus-visible:bg-dept-white focus-visible:text-dept-black"
              >
                {option.label}
                {checked && <span aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ count, value, onChange }: FilterBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLButtonElement>(null);
  const priceRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);

  // close on outside click / Escape (returning focus to the trigger)
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      const refs = { availability: availabilityRef, price: priceRef, sort: sortRef };
      refs[openMenu].current?.focus();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const priceSorted = value.sort === "price-asc" || value.sort === "price-desc";

  return (
    <div
      ref={containerRef}
      className="font-condensed relative z-20 flex items-center justify-between gap-4 border-y border-white/10 bg-dept-black px-gutter py-3.5 text-[11px] tracking-[0.16em] text-dept-white sm:gap-6 sm:text-[12px] sm:tracking-[0.2em]"
    >
      <div className="flex items-center gap-5 sm:gap-7">
        <span className="hidden text-[11px] text-dept-gray-500 sm:block">Filtrar</span>
        <Dropdown
          id="availability"
          label="Availability"
          options={AVAILABILITY}
          selected={value.availability}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onSelect={(availability) => {
            onChange({ ...value, availability });
            setOpenMenu(null);
          }}
          active={value.availability !== "all"}
          triggerRef={availabilityRef}
        />
        <Dropdown
          id="price"
          label="Price"
          options={PRICE}
          selected={priceSorted ? value.sort : null}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onSelect={(sort) => {
            onChange({ ...value, sort });
            setOpenMenu(null);
          }}
          active={priceSorted}
          triggerRef={priceRef}
        />
      </div>

      <div className="flex items-center gap-5 sm:gap-7">
        <span className="hidden text-[11px] tabular-nums text-dept-gray-300 sm:block" aria-live="polite">
          {String(count).padStart(2, "0")} artículos
        </span>
        <Dropdown
          id="sort"
          label="Ordenar"
          options={SORT}
          selected={value.sort}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onSelect={(sort) => {
            onChange({ ...value, sort });
            setOpenMenu(null);
          }}
          align="right"
          triggerRef={sortRef}
        />
      </div>
    </div>
  );
}
