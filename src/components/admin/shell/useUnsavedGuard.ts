"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConfirm } from "@/components/admin/ui/Overlay";

/**
 * Avisa antes de salir con cambios sin guardar: `beforeunload` (cerrar/recargar) y clics en enlaces internos
 * (sidebar, breadcrumbs…), que no disparan `beforeunload` en una SPA.
 */
export function useUnsavedGuard(dirty: boolean, message = "Tienes cambios sin guardar. Si sales ahora se perderán.") {
  const router = useRouter();
  const confirm = useConfirm();
  const msg = useRef(message);
  useEffect(() => { msg.current = message; }, [message]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm({ title: "Cambios sin guardar", message: msg.current, confirmLabel: "Salir sin guardar", danger: true }).then((ok) => { if (ok) router.push(url.pathname + url.search + url.hash); });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty, confirm, router]);
}
