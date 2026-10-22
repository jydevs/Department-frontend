"use client";

import { useRouter } from "@/lib/admin/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LogOut, Menu as MenuIcon, Moon, Search, Sun, UserCircle } from "lucide-react";
import { NAV_ITEMS } from "@/lib/admin/nav";
import { useAuth } from "@/lib/admin/auth";
import { hasPermissions } from "@/lib/admin/permissions";
import { useTheme } from "@/lib/admin/theme";
import { STOREFRONT_URL, cn } from "@/lib/admin/utils";
import { IconButton } from "@/components/admin/ui/button";
import { Dialog } from "@/components/admin/ui/overlay";
import { Kbd } from "@/components/admin/ui/display";
import { Menu } from "@/components/admin/ui/navigation";
import { Brand } from "./sidebar";

function QuickNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { permissions } = useAuth();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return NAV_ITEMS.filter((i) => hasPermissions(permissions, i.perms)).filter((i) => !term || i.label.toLowerCase().includes(term));
  }, [q, permissions]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Ir a…" size="sm">
      <input
        data-autofocus=""
        role="combobox"
        aria-expanded="true"
        aria-controls="quicknav-list"
        aria-activedescendant={results[cursor] ? `quicknav-${cursor}` : undefined}
        aria-label="Buscar sección"
        value={q}
        placeholder="Buscar una sección…"
        onChange={(e) => {
          setQ(e.target.value);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && results[cursor]) {
            go(results[cursor].href);
          }
        }}
        className="h-10 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm placeholder:text-muted/80 focus:border-focus focus:outline-none"
      />
      <ul id="quicknav-list" role="listbox" aria-label="Secciones" className="mt-3 flex max-h-72 flex-col gap-0.5 overflow-y-auto">
        {results.map((r, i) => (
          <li key={r.href} id={`quicknav-${i}`} role="option" aria-selected={i === cursor}>
            <button type="button" tabIndex={-1} onClick={() => go(r.href)} onMouseEnter={() => setCursor(i)} className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm", i === cursor && "bg-surface-2")}>
              <r.icon aria-hidden size={16} className="text-muted" />
              {r.label}
            </button>
          </li>
        ))}
        {results.length === 0 ? <li className="px-2.5 py-3 text-sm text-muted">Sin resultados</li> : null}
      </ul>
    </Dialog>
  );
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [quick, setQuick] = useState(false);

  // atajo "/" para la búsqueda rápida (no si se está escribiendo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      setQuick(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const initials = (user?.fullName || user?.email || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-h)] items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur sm:px-5">
      <IconButton label="Abrir menú" className="lg:hidden" icon={<MenuIcon aria-hidden size={20} />} onClick={onOpenMenu} />
      <Brand className="lg:hidden" />
      <button
        type="button"
        onClick={() => setQuick(true)}
        className="ml-2 hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:border-border-strong md:flex"
      >
        <Search aria-hidden size={15} />
        <span className="flex-1 text-left">Ir a…</span>
        <Kbd>/</Kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Buscar sección" className="md:hidden" icon={<Search aria-hidden size={18} />} onClick={() => setQuick(true)} />
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text sm:inline-flex"
        >
          Ver tienda
          <ExternalLink aria-hidden size={14} />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
        <IconButton label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} icon={theme === "dark" ? <Sun aria-hidden size={18} /> : <Moon aria-hidden size={18} />} onClick={toggle} />
        <Menu
          label="Menú de usuario"
          trigger={
            <span className="flex items-center gap-2 rounded-md py-1 pr-1 pl-1 hover:bg-surface-2 sm:pr-2">
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden flex-col text-left leading-tight sm:flex">
                <span className="max-w-32 truncate text-[13px] font-medium">{user?.fullName}</span>
                <span className="text-[11px] text-muted capitalize">{user?.role}</span>
              </span>
              <span className="sr-only">Menú de usuario</span>
            </span>
          }
          items={[
            { label: "Mi cuenta", icon: <UserCircle aria-hidden size={15} />, onSelect: () => router.push("/account") },
            { label: "Cerrar sesión", icon: <LogOut aria-hidden size={15} />, onSelect: () => void logout() },
          ]}
        />
      </div>
      <QuickNav key={quick ? "open" : "closed"} open={quick} onClose={() => setQuick(false)} />
    </header>
  );
}

