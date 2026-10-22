"use client";

/**
 * Navegación del panel. Las rutas internas del panel se escriben sin prefijo ("/orders", "/products/new") y aquí se les
 * antepone `/admin`; las URLs externas, anclas, mailto:/tel: y las rutas que ya empiezan por `/admin` no se tocan.
 * `usePathname` devuelve la ruta SIN el prefijo, para que la lógica del panel (menú activo, `next` del login) no cambie.
 */

import { forwardRef, useMemo, type ComponentProps } from "react";
import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";

export const ADMIN_BASE = "/admin";

/** "/orders?x=1" → "/admin/orders?x=1". Cualquier otra cosa se devuelve igual. */
export function adminHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === ADMIN_BASE || href.startsWith(`${ADMIN_BASE}/`) || href.startsWith(`${ADMIN_BASE}?`) || href.startsWith(`${ADMIN_BASE}#`)) return href;
  return href === "/" ? ADMIN_BASE : `${ADMIN_BASE}${href}`;
}

/** "/admin/orders" → "/orders"; "/admin" → "/". */
export function stripAdminBase(pathname: string): string {
  if (pathname === ADMIN_BASE) return "/";
  return pathname.startsWith(`${ADMIN_BASE}/`) ? pathname.slice(ADMIN_BASE.length) : pathname;
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function AdminLink({ href, ...rest }, ref) {
  return <NextLink ref={ref} href={adminHref(href)} {...rest} />;
});

export function usePathname(): string {
  return stripAdminBase(useNextPathname() ?? "/");
}

export function useRouter() {
  const router = useNextRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(adminHref(href), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(adminHref(href), options),
      prefetch: (href: string) => router.prefetch(adminHref(href)),
    }),
    [router],
  );
}
