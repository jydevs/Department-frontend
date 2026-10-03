"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/admin/auth";
import { canAccess, firstAllowedRoute } from "@/lib/admin/nav";
import { Marquee } from "@/components/ui/Marquee";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function NoPermission({ home }: { home: string }) {
  useEffect(() => { document.title = "Sin permiso · Panel Dept."; }, []);
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center" data-testid="admin-no-permission">
      <ShieldOff className="size-8 text-muted" aria-hidden />
      <h1 className="font-display text-display-md">No tienes permiso para ver esta sección</h1>
      <p className="max-w-md text-sm text-muted">Tu rol no incluye acceso a esta pantalla. Si lo necesitas, pídeselo a un propietario o administrador.</p>
      <Link href={home} className="adm-label inline-block py-2 text-accent-text underline">Ir a una sección permitida</Link>
    </div>
  );
}

/** Estructura del panel (barra lateral, ticker y cabecera). Sin sesión redirige a `/admin/login`. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, reason, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    // un cierre voluntario no deja `?next=`: la siguiente persona no debe heredar la ruta de la anterior
    if (status === "anon") router.replace(reason === "logout" ? "/admin/login" : `/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [status, reason, pathname, router]);
  const allowed = status === "authed" && canAccess(pathname, permissions);
  const home = status === "authed" ? firstAllowedRoute(permissions) : "/admin";
  // Sin Inicio (analytics:read) se aterriza en la primera ruta permitida
  const toHome = status === "authed" && !allowed && pathname === "/admin" && home !== "/admin";
  useEffect(() => {
    if (toHome) router.replace(home);
  }, [toHome, home, router]);
  if (status !== "authed" || toHome) return <div role="status" className="grid min-h-screen place-items-center text-sm text-muted">Cargando panel…</div>;
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white">Saltar al contenido</a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} mobileOpen={mobile} onMobileClose={() => setMobile(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-line bg-surface py-1.5" aria-hidden>
          <Marquee items={["Panel de administración", "Daregular Dept.", "Uniforms for the unnoticed", "Precios en COP"]} duration={60} itemClassName="font-condensed text-[10px] tracking-[0.28em] text-muted uppercase" />
        </div>
        <Topbar onMenu={() => setMobile(true)} />
        <main id="main" className="flex-1 px-4 py-8 lg:px-8">{allowed ? children : <NoPermission home={home} />}</main>
      </div>
    </div>
  );
}
