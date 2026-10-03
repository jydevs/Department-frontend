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
      <main id="main" className="flex-1">{children}</main>
      {footer}
      <div className="grain" aria-hidden />
    </>
  );
}
