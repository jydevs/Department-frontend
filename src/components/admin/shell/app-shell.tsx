"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-contrast"
      >
        Saltar al contenido
      </a>
      <Sidebar mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} />
      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-[var(--sidebar-w)]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
