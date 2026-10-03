"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/data/types";
import { apiFetch } from "@/lib/api/client";
import { fromSummary } from "@/lib/api/map";
import type { ApiSearch, Cursor, ApiProductSummary } from "@/lib/api/types";
import { cfg, useSite } from "@/components/layout/SiteProvider";
import { SearchResultRow } from "./SearchResultRow";
import { SearchSuggestions } from "./SearchSuggestions";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]';

interface SearchPanelProps {
  onClose: () => void;
}

/**
 * The live content of the search overlay. It is only mounted while the overlay
 * is open, so query / active row reset naturally on every open.
 *
 * Semantics: the input is a `combobox` that owns a `listbox` of product links;
 * arrow keys move `aria-activedescendant`, Enter opens the active (or first)
 * result. Tab cycles inside the dialog.
 */
export function SearchPanel({ onClose }: SearchPanelProps) {
  const router = useRouter();
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;

  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** true when a link was chosen → don't yank focus back to the header icon */
  const navigating = useRef(false);
  /** true when the last active-row change came from the keyboard → scroll it into view */
  const scrollActive = useRef(false);

  const site = useSite();
  const c = cfg(site.search.settings);
  const L = {
    title: c.str("title", "Buscar"), placeholder: c.str("placeholder", "¿Qué buscas?"), close: c.str("closeLabel", "Cerrar"),
    suggestions: c.str("suggestionsTitle", "Sugerencias"), popular: c.str("popularTitle", "Más buscado"),
    one: c.str("resultSingular", "resultado"), many: c.str("resultPlural", "resultados"),
    noTitle: c.str("noResultsTitle", "Sin resultados para «{query}»"), noText: c.str("noResultsText", "Prueba con otro nombre o explora las colecciones."),
    popularLimit: c.num("popularLimit", 4),
  };

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const items = hasQuery ? results : featured;

  // "Más buscado": los productos más recientes disponibles
  useEffect(() => {
    const ctl = new AbortController();
    apiFetch<Cursor<ApiProductSummary>>("/storefront/products", { query: { limit: L.popularLimit, sort: "newest" }, signal: ctl.signal })
      .then((r) => setFeatured(r.items.filter((p) => p.available).map(fromSummary)))
      .catch(() => undefined);
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // búsqueda en la API con espera de 250 ms (la API pide 2 caracteres como mínimo)
  useEffect(() => {
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      apiFetch<ApiSearch>("/storefront/search", { query: { q: trimmed }, signal: ctl.signal })
        .then((r) => setResults(r.products.map(fromSummary)))
        .catch((e: unknown) => { if (!(e instanceof DOMException)) setResults([]); })
        .finally(() => { if (!ctl.signal.aborted) setSearching(false); });
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [trimmed]);
  const activeIdx = active >= 0 && active < items.length ? active : -1;
  const optionId = (product: Product) => `${uid}-opt-${product.handle}`;
  const activeId = activeIdx >= 0 ? optionId(items[activeIdx]) : undefined;

  // focus the input on open; give focus back to whatever opened us on close
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      if (!navigating.current && opener && opener.isConnected) opener.focus();
    };
  }, []);

  // Escape closes; Tab / Shift+Tab loop inside the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex >= 0,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (!(current instanceof Node) || !root.contains(current)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // keep the keyboard-selected row visible inside the scroll area
  useEffect(() => {
    if (!activeId || !scrollActive.current) return;
    scrollActive.current = false;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActive(-1);
  };

  const choose = (product: Product) => {
    navigating.current = true;
    router.push(`/products/${product.handle}`);
    onClose();
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (items.length === 0) return;
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next =
        activeIdx < 0
          ? dir > 0
            ? 0
            : items.length - 1
          : (activeIdx + dir + items.length) % items.length;
      scrollActive.current = true;
      setActive(next);
      return;
    }

    if (e.key === "Enter") {
      // with an empty query only an explicitly highlighted row is opened
      const target = activeIdx >= 0 ? items[activeIdx] : hasQuery ? items[0] : undefined;
      if (!target) return;
      e.preventDefault();
      choose(target);
    }
  };

  // click on the dimmed empty area (not on a row / chip / label) closes
  const handleScrollAreaClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || e.target === contentRef.current) onClose();
  };

  const handleNavigate = () => {
    navigating.current = true;
    onClose();
  };

  const count = results.length;
  const status = hasQuery ? (searching ? "…" : `${count} ${count === 1 ? L.one : L.many}`) : "";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={L.title}
      data-testid="search-overlay"
      style={{ animation: "search-overlay-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) backwards" }}
      className="fixed inset-0 z-[60] flex flex-col bg-dept-black/95 text-dept-white"
    >
      <style>{`@keyframes search-overlay-in{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}`}</style>

      {/* Top bar */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-gutter">
        <p className="text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">{L.title}</p>
        <button
          type="button"
          aria-label={L.close}
          onClick={onClose}
          className="flex size-11 items-center justify-center border border-white/15 text-lg leading-none transition-colors duration-300 ease-out-expo hover:border-dept-white hover:bg-dept-white hover:text-dept-black"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>

      {/* Query */}
      <div className="shrink-0 px-gutter pt-6 md:pt-10">
        <label htmlFor={inputId} className="sr-only">
          Buscar productos
        </label>
        <input
          ref={inputRef}
          id={inputId}
          data-testid="search-input"
          type="text"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={items.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={L.placeholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleInputKeyDown}
          className="font-display text-display-lg w-full border-0 border-b-2 border-white/20 bg-transparent py-3 text-dept-white caret-[var(--dept-red)] outline-none transition-colors duration-300 ease-out-expo placeholder:text-white/25 focus:border-dept-red md:py-4"
        />
        <p
          role="status"
          aria-live="polite"
          className="min-h-5 pt-3 text-[11px] uppercase leading-5 tracking-[0.2em] text-dept-gray-500"
        >
          {status}
        </p>
      </div>

      {/* Results (scrolls inside the overlay) */}
      <div
        onClick={handleScrollAreaClick}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-16"
      >
        <div ref={contentRef} className="px-gutter pt-6 md:pt-8">
          {!hasQuery && (
            <div className="mb-12">
              <SearchSuggestions onNavigate={handleNavigate} />
            </div>
          )}

          {hasQuery && count === 0 && !searching && trimmed.length >= 2 && (
            <div className="mb-12">
              <p className="font-display text-display-md break-words">
                {L.noTitle.replace("{query}", trimmed)}
              </p>
              <p className="mt-3 text-sm text-dept-gray-500">
                {L.noText}
              </p>
              <div className="mt-10">
                <SearchSuggestions onNavigate={handleNavigate} />
              </div>
            </div>
          )}

          {items.length > 0 && (
            <section>
              {!hasQuery && (
                <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-dept-gray-500">
                  {L.popular}
                </p>
              )}
              <ul
                id={listId}
                role="listbox"
                aria-label={hasQuery ? c.str("resultsLabel", "Resultados") : L.popular}
                className="grid border-t border-white/10 md:grid-cols-2 md:gap-x-12 md:border-t-0 md:[&>li:nth-child(-n+2)]:border-t md:[&>li:nth-child(-n+2)]:border-white/10"
              >
                {items.map((product, i) => (
                  <SearchResultRow
                    key={product.handle}
                    product={product}
                    id={optionId(product)}
                    active={i === activeIdx}
                    onHover={() => {
                      if (i !== activeIdx) setActive(i);
                    }}
                    onSelect={handleNavigate}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
