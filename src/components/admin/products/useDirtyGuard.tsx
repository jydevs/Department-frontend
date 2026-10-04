"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Dialog } from "@/components/admin/ui/Overlay";

interface Pending { go: () => void | Promise<void>; message: string; allowSave: boolean; continueLabel: string }
export interface GuardOpts {
  /** Texto del aviso (qué se pierde). */
  message?: string;
  /** Ofrece "Guardar y continuar" (por defecto sí). */
  allowSave?: boolean;
  /** Etiqueta del botón que continúa sin guardar (por defecto "Descartar y continuar"). */
  continueLabel?: string;
}

/**
 * Guarda de cambios sin guardar con TRES salidas (guardar / descartar / cancelar) para el editor:
 * - `guard(acción)`: ejecuta la acción de inmediato si no hay cambios; si los hay, abre el diálogo antes (Duplicar, Eliminar, `router.push`…).
 * - `push(href)` / `replace(href)`: navegación programática protegida (el `router` de Next no ofrece forma de interceptarla desde fuera).
 * - Clics en enlaces internos (sidebar, migas…) y `beforeunload` (cerrar/recargar) pasan por el mismo diálogo.
 * Limitación de Next: el botón Atrás del navegador no se puede bloquear sin romper el historial; solo `beforeunload` cubre recargar/cerrar.
 * `save` debe devolver `true` si guardó bien (si falla, el diálogo se cierra y el editor muestra el error).
 */
export function useDirtyGuard(dirty: boolean, save: () => Promise<boolean>) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const guard = useCallback((go: () => void | Promise<void>, o: GuardOpts = {}) => {
    if (!dirtyRef.current) { void go(); return; }
    setPending({ go, message: o.message ?? "Tienes cambios sin guardar. ¿Qué quieres hacer con ellos?", allowSave: o.allowSave ?? true, continueLabel: o.continueLabel ?? "Descartar y continuar" });
  }, []);
  const push = useCallback((href: string) => guard(() => router.push(href), { message: "Tienes cambios sin guardar. Si sales ahora se perderán, salvo que los guardes." }), [guard, router]);
  const replace = useCallback((href: string) => guard(() => router.replace(href)), [guard, router]);

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
      push(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty, push]);

  const cancel = () => { if (!busy) setPending(null); };
  const run = async (withSave: boolean) => {
    const p = pending;
    if (!p) return;
    if (withSave) {
      setBusy(true);
      const ok = await save().catch(() => false);
      setBusy(false);
      if (!ok) { setPending(null); return; }
    }
    setPending(null);
    await p.go();
  };
  const dialog: ReactNode = (
    <Dialog open={!!pending} onClose={cancel} title="Cambios sin guardar" size="sm"
      footer={<>
        <Button onClick={cancel} disabled={busy}>Cancelar</Button>
        <Button variant="danger" onClick={() => void run(false)} disabled={busy}>{pending?.continueLabel}</Button>
        {pending?.allowSave && <Button variant="primary" loading={busy} onClick={() => void run(true)}>Guardar y continuar</Button>}
      </>}>
      <p className="text-sm text-muted">{pending?.message}</p>
    </Dialog>
  );
  return { guard, push, replace, dialog };
}
