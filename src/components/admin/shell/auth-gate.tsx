"use client";

import { usePathname, useRouter } from "@/lib/admin/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/admin/auth";
import { Skeleton, Spinner } from "@/components/admin/ui/spinner";
import { SecurityGate } from "@/components/admin/auth/security-gate";

export function ShellSkeleton() {
  return (
    <div className="min-h-dvh" role="status" aria-label="Cargando panel">
      <aside className="fixed inset-y-0 left-0 hidden w-[var(--sidebar-w)] border-r border-border bg-surface p-4 lg:block">
        <Skeleton className="mb-8 h-8 w-40" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-7 w-full" />
        ))}
      </aside>
      <div className="lg:pl-[var(--sidebar-w)]">
        <div className="h-[var(--topbar-h)] border-b border-border bg-surface" />
        <div className="flex items-center gap-3 p-8 text-muted">
          <Spinner size={18} />
          <span className="text-sm">Cargando…</span>
        </div>
      </div>
    </div>
  );
}

/** loading → esqueleto; anon → /login?next=…; authed con restricción → pantalla de seguridad; authed → hijos. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, loggedOut, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "anon") return;
    const next = `${pathname}${window.location.search}`;
    router.replace(loggedOut || pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  }, [status, loggedOut, pathname, router]);

  if (status !== "authed") return <ShellSkeleton />;
  // cuenta con restricción de seguridad: ni el panel ni sus peticiones hasta resolverla
  if (user?.mustChangePassword || user?.twoFactorSetupRequired) return <SecurityGate />;
  return <>{children}</>;
}
