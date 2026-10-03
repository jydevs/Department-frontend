"use client";
import clsx from "clsx";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/layout/Logo";
import { NAV } from "@/lib/admin/nav";
import { useAuth } from "@/lib/admin/auth";

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!mobileOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onMobileClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [mobileOpen, onMobileClose]);
  const { permissions } = useAuth();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || (pathname.startsWith(`${href}/`) && !NAV.flatMap((g) => g.items).some((o) => o.href !== href && o.href.startsWith(`${href}/`) && pathname.startsWith(o.href))));
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onMobileClose} aria-hidden />}
      <aside aria-label="Navegación principal" className={clsx("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", collapsed ? "lg:w-16" : "lg:w-60", "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full max-lg:invisible")}>
        <div className="flex h-[84px] items-center justify-between border-b border-line px-4">
          <Link href="/admin" className="flex items-center gap-2" onClick={onMobileClose}>
            <Logo size="sm" />
            {!collapsed && <span className="font-condensed text-[11px] tracking-[0.2em] text-muted">Panel</span>}
          </Link>
          <button type="button" aria-label="Cerrar menú" className="lg:hidden" onClick={onMobileClose}><X className="size-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map((g, gi) => {
            const items = g.items.filter((i) => permissions.includes(i.perm));
            if (!items.length) return null;
            return (
              <div key={gi} className="mb-3">
                {g.label && !collapsed && <p className="font-condensed px-2 pb-1 pt-2 text-[11px] tracking-[0.14em] text-muted">{g.label}</p>}
                <ul className="flex flex-col gap-0.5">
                  {items.map((it) => {
                    const Icon = it.icon, act = isActive(it.href);
                    return (
                      <li key={it.href}>
                        <Link href={it.href} onClick={onMobileClose} aria-current={act ? "page" : undefined} title={collapsed ? it.label : undefined}
                          className={clsx("font-condensed relative flex h-10 items-center gap-3 px-3 text-[13px] tracking-[0.12em]", act ? "bg-fg text-bg" : "text-muted hover:bg-surface2 hover:text-fg", collapsed && "lg:justify-center")}>
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
