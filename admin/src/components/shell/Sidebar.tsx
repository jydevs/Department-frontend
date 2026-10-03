"use client";
import clsx from "clsx";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/config/nav";
import { useAuth } from "@/lib/auth";

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || (pathname.startsWith(`${href}/`) && !NAV.flatMap((g) => g.items).some((o) => o.href !== href && o.href.startsWith(`${href}/`) && pathname.startsWith(o.href))));
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onMobileClose} aria-hidden />}
      <aside aria-label="Navegación principal" className={clsx("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-transform lg:static lg:translate-x-0", collapsed ? "lg:w-16" : "lg:w-60", "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" onClick={onMobileClose}>
            <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-white">D</span>
            {!collapsed && <span>Dept. Admin</span>}
          </Link>
          <button type="button" aria-label="Cerrar menú" className="lg:hidden" onClick={onMobileClose}><X className="size-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map((g, gi) => {
            const items = g.items.filter((i) => permissions.includes(i.perm));
            if (!items.length) return null;
            return (
              <div key={gi} className="mb-3">
                {g.label && !collapsed && <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>}
                <ul className="flex flex-col gap-0.5">
                  {items.map((it) => {
                    const Icon = it.icon, act = isActive(it.href);
                    return (
                      <li key={it.href}>
                        <Link href={it.href} onClick={onMobileClose} aria-current={act ? "page" : undefined} title={collapsed ? it.label : undefined}
                          className={clsx("flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm", act ? "bg-accent/15 font-medium text-accent" : "text-muted hover:bg-surface2 hover:text-fg", collapsed && "lg:justify-center")}>
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className={clsx(collapsed && "lg:sr-only")}>{it.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <button type="button" onClick={onToggle} aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"} className="hidden h-10 items-center justify-center border-t border-line text-muted hover:text-fg lg:flex">
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </aside>
    </>
  );
}
