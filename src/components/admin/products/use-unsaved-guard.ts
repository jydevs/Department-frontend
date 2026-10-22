"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { useConfirm } from "@/components/admin/ui";

/**
 * Avisa al salir con cambios sin guardar: cierre/recarga de pestaña (beforeunload) y clics en enlaces internos
 * (el App Router no tiene un guard de navegación propio). Devuelve `leave(href)` para navegar sin aviso
 * después de guardar.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const dirtyRef = useRef(dirty);
  const bypass = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || bypass.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: "Tienes cambios sin guardar",
        description: "Si sales ahora perderás los cambios que no hayas guardado.",
        confirmLabel: "Salir sin guardar",
        cancelLabel: "Seguir editando",
        tone: "danger",
      }).then((ok) => {
        if (ok) {
          bypass.current = true;
          router.push(url.pathname + url.search + url.hash);
        }
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirm, router]);

  return {
    leave: (href: string) => {
      bypass.current = true;
      router.push(href);
    },
    /** Desactiva el aviso (p. ej. justo antes de redirigir tras guardar). */
    disarm: () => {
      bypass.current = true;
    },
    arm: () => {
      bypass.current = false;
    },
  };
}
