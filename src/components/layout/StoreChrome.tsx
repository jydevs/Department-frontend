"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Oculta el chrome de la tienda (header, footer, grano) dentro del panel `/admin`. */
export function StoreChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");
  if (inAdmin) return <div className="flex-1">{children}</div>;
  return (
    <>
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      {header}
      {/* altura mínima: las páginas de cliente (login, checkout, 404…) pintan su contenido tras hidratar y sin ella el pie saltaba (CLS) */}
      <main id="main" className="min-h-[100svh] flex-1">{children}</main>
      {footer}
      <div className="grain" aria-hidden />
    </>
  );
}
