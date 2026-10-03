"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/admin/auth";
import { Marquee } from "@/components/ui/Marquee";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** Estructura del panel (barra lateral, ticker y cabecera). Sin sesión redirige a `/admin/login`. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (status === "anon") router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  if (status !== "authed") return <div role="status" className="grid min-h-screen place-items-center text-sm text-muted">Cargando panel…</div>;
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white">Saltar al contenido</a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} mobileOpen={mobile} onMobileClose={() => setMobile(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-line bg-surface py-1.5" aria-hidden>
          <Marquee items={["Panel de administración", "Daregular Dept.", "Uniforms for the unnoticed", "Precios en COP"]} duration={60} itemClassName="font-condensed text-[10px] tracking-[0.28em] text-muted uppercase" />
        </div>
        <Topbar onMenu={() => setMobile(true)} />
        <main id="main" className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
