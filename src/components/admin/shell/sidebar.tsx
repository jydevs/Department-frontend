"use client";

import { Link } from "@/lib/admin/navigation";
import { usePathname } from "@/lib/admin/navigation";
import { useMemo } from "react";
import { NAV, isActive } from "@/lib/admin/nav";
import { useAuth } from "@/lib/admin/auth";
import { hasPermissions } from "@/lib/admin/permissions";
import { cn } from "@/lib/admin/utils";
import { Drawer } from "@/components/admin/ui/overlay";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-md", className)} aria-label="Daregular Dept. — Inicio del panel">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-md bg-accent text-sm font-extrabold tracking-tight text-accent-contrast">
        D
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight">Daregular Dept.</span>
        <span className="mt-1 text-[11px] font-medium tracking-widest text-muted uppercase">Admin</span>
      </span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { permissions } = useAuth();

  const groups = useMemo(
    () =>
      NAV.map((g) => ({ ...g, items: g.items.filter((i) => hasPermissions(permissions, i.perms)) })).filter((g) => g.items.length > 0),
    [permissions],
  );

  return (
    <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((g, gi) => (
        <div key={g.title ?? `g${gi}`} className={cn(gi > 0 && "mt-5")}>
          {g.title ? <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{g.title}</p> : null}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-accent/15 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon aria-hidden size={17} className={cn("shrink-0", active && "text-accent-text")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Barra lateral: fija (248 px) en escritorio; drawer en móvil/tablet (controlado por `mobileOpen`). */
export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-[var(--topbar-h)] shrink-0 items-center px-4">
          <Brand />
        </div>
        <SidebarNav />
      </aside>
      <Drawer open={mobileOpen} onClose={onMobileClose} side="left" width={288} title="Menú de navegación" hideHeader bodyClassName="flex flex-col" className="bg-surface">
        <div className="flex h-[var(--topbar-h)] shrink-0 items-center px-4">
          <Brand />
        </div>
        <SidebarNav onNavigate={onMobileClose} />
      </Drawer>
    </>
  );
}
