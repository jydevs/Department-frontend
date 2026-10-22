"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { useCustomer } from "@/lib/account/useCustomer";
import { Spinner } from "./ui";

const TABS = [
  { href: "/account", label: "Perfil" },
  { href: "/account/orders", label: "Pedidos" },
  { href: "/account/addresses", label: "Direcciones" },
  { href: "/account/privacy", label: "Privacidad" },
] as const;

function isCurrent(href: string, pathname: string): boolean {
  return href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Frame of every page that needs a session. Anonymous visitors are sent to /account/login?next=<this page> (the proxy
 * does the same before rendering when there is no cookie at all; this covers expired or revoked sessions).
 */
export function AccountArea({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, customer, logout, ended } = useCustomer();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (status === "anonymous" && !leaving && !ended) router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
  }, [status, leaving, ended, pathname, router]);

  if (status !== "authenticated" || !customer) {
    return (
      <div className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
        <Spinner label={status === "anonymous" ? "Redirigiendo al inicio de sesión…" : "Cargando tu cuenta…"} />
      </div>
    );
  }

  const handleLogout = async () => {
    setLeaving(true);
    await logout();
    router.replace("/account/login");
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Mi cuenta</p>
            <p data-testid="account-greeting" className="font-display text-display-lg mt-1 text-dept-white">
              Hola, {customer.firstName}
            </p>
          </div>
          <button
            type="button"
            data-testid="logout-btn"
            onClick={handleLogout}
            disabled={leaving}
            className="font-condensed border border-white/20 px-5 py-2.5 text-xs tracking-[0.16em] text-dept-white transition-colors hover:border-dept-white hover:bg-dept-white hover:text-dept-black disabled:opacity-50"
          >
            {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>

        <nav aria-label="Secciones de mi cuenta" className="mb-10 border-b border-white/10">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const current = isCurrent(tab.href, pathname);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={current ? "page" : undefined}
                    className={clsx(
                      "font-condensed block whitespace-nowrap border-b-2 px-4 py-3 text-xs tracking-[0.16em] transition-colors",
                      current ? "border-dept-red text-dept-white" : "border-transparent text-dept-gray-500 hover:text-dept-white",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {children}
      </div>
    </div>
  );
}
