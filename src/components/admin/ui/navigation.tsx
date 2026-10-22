"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MoreHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { formatNumber } from "@/lib/admin/format";
import { IconButton } from "./button";
import { controlClasses } from "./field";

/* ---------------- Tabs ---------------- */

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /** Prefijo para enlazar con <TabPanel base=…>. */
  base?: string;
  "aria-label"?: string;
  className?: string;
}

export function Tabs({ tabs, value, onChange, base, "aria-label": ariaLabel, className }: TabsProps) {
  const auto = useId();
  const prefix = base ?? auto;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (from: number, dir: 1 | -1 | "start" | "end") => {
    const enabled = tabs.filter((t) => !t.disabled);
    if (!enabled.length) return;
    const cur = enabled.findIndex((t) => t.key === tabs[from].key);
    let idx: number;
    if (dir === "start") idx = 0;
    else if (dir === "end") idx = enabled.length - 1;
    else idx = (cur + dir + enabled.length) % enabled.length;
    const target = enabled[idx];
    onChange(target.key);
    refs.current[target.key]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? "start" : e.key === "End" ? "end" : null;
    if (dir === null) return;
    e.preventDefault();
    move(i, dir);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((t, i) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${t.key}`}
            aria-selected={active}
            aria-controls={`${prefix}-panel-${t.key}`}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
              active ? "border-accent text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
            {t.count !== undefined ? <span className="rounded-full bg-surface-3 px-1.5 text-xs text-muted">{formatNumber(t.count)}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ base, tabKey, active, children, className }: { base: string; tabKey: string; active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`${base}-panel-${tabKey}`} aria-labelledby={`${base}-tab-${tabKey}`} tabIndex={0} className={cn("pt-4 outline-offset-4", className)}>
      {children}
    </div>
  );
}

/* ---------------- Pagination ---------------- */

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
  className?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50, 100], className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-muted", className)}>
      <p aria-live="polite">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Filas</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(controlClasses, "h-8 w-auto cursor-pointer px-2 text-[13px]")}
              aria-label="Filas por página"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="tabular-nums">
          Página {page} de {totalPages}
        </span>
        <IconButton label="Página anterior" variant="secondary" size="sm" icon={<ChevronLeft aria-hidden size={16} />} disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
        <IconButton label="Página siguiente" variant="secondary" size="sm" icon={<ChevronRight aria-hidden size={16} />} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} />
      </div>
    </nav>
  );
}

/* ---------------- SearchInput (debounce 300 ms) ---------------- */

export interface SearchInputProps {
  value: string;
  /** Se llama con el texto ya "debounced". */
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, placeholder = "Buscar…", delay = 300, label = "Buscar", className, autoFocus }: SearchInputProps) {
  const [text, setText] = useState(value);
  const [lastProp, setLastProp] = useState(value);
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  });
  // sincroniza si el padre cambia el valor desde fuera (p. ej. "limpiar filtros")
  if (value !== lastProp) {
    setLastProp(value);
    setText(value);
  }

  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => changeRef.current(text), delay);
    return () => clearTimeout(t);
  }, [text, value, delay]);

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") changeRef.current(text);
          if (e.key === "Escape" && text) {
            setText("");
            changeRef.current("");
          }
        }}
        className={cn(controlClasses, "h-9 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {text ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            setText("");
            changeRef.current("");
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-text"
        >
          <X aria-hidden size={14} />
        </button>
      ) : null}
    </div>
  );
}

/* ---------------- Menu (acciones por fila / desplegables) ---------------- */

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({ items, label = "Más acciones", trigger, align = "right" }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [pos, setPos] = useState<CSSProperties | null>(null);

  // La lista se pinta en un portal con posición fija para que no la recorte el overflow de tablas o tarjetas.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const h = listRef.current?.offsetHeight ?? 0;
      const below = window.innerHeight - r.bottom;
      const top = below < h + 8 && r.top > below ? Math.max(8, r.top - h - 4) : r.bottom + 4;
      setPos(align === "right" ? { top, right: Math.max(8, window.innerWidth - r.right) } : { top, left: Math.max(8, r.left) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    const els = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger ? (
        <button ref={btnRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} className="inline-flex items-center rounded-md">
          {trigger}
        </button>
      ) : (
        <IconButton ref={btnRef} label={label} icon={<MoreHorizontal aria-hidden size={16} />} size="sm" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} />
      )}
      {open
        ? createPortal(
        <div
          ref={listRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          style={pos ?? { top: 0, left: 0, visibility: "hidden" }}
          className="dept-anim-pop fixed z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-md"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2 focus:bg-surface-2 focus:outline-none disabled:opacity-50",
                it.danger && "text-danger",
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
