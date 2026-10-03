"use client";
import { ExternalLink, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/admin/auth";
import { IconButton } from "@/components/admin/ui/Button";


export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setTimeout(() => setDark(document.querySelector<HTMLElement>(".admin-root")?.dataset.theme !== "light"), 0); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    const root = document.querySelector<HTMLElement>(".admin-root"); if (root) root.dataset.theme = next;
    try { localStorage.setItem("dept-admin-theme", next); } catch { /* sin almacenamiento */ }
    setDark(!dark);
  };
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-xl lg:px-6">
      <IconButton label="Abrir menú" className="lg:hidden" onClick={onMenu}><Menu className="size-5" /></IconButton>
      <div className="flex-1" />
      <Link href="/" target="_blank" rel="noopener" className="flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm text-muted hover:bg-surface2 hover:text-fg">
        Ver tienda <ExternalLink className="size-3.5" aria-hidden />
      </Link>
      <IconButton label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} onClick={toggle}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</IconButton>
      <div className="relative" ref={ref}>
        <button type="button" aria-expanded={open} aria-controls="user-menu" onClick={() => setOpen(!open)} className="flex h-9 items-center gap-2 rounded-sm px-2 hover:bg-surface2">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-white">{user?.name?.[0]}</span>
          <span className="hidden text-sm sm:block">{user?.name}</span>
        </button>
        {open && (
          <div id="user-menu" className="absolute right-0 mt-1 w-52 rounded-sm border border-line bg-surface p-1 shadow-xl">
            <p className="px-3 py-2 text-xs text-muted">{user?.email}</p>
            <Link href="/admin/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-surface2"><User className="size-4" /> Mi cuenta</Link>
            <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-surface2" data-testid="admin-logout"><LogOut className="size-4" /> Cerrar sesión</button>
          </div>
        )}
      </div>
    </header>
  );
}
