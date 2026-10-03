"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export interface FocusTrapOptions {
  /** activo (por defecto sí). Para paneles que se montan solo mientras están abiertos basta con no indicarlo. */
  active?: boolean;
  /** se llama al pulsar Escape (normalmente: cerrar el diálogo) */
  onEscape?: () => void;
  /**
   * Foco inicial al activarse: una ref, un selector CSS dentro del contenedor, una función que devuelve el elemento, o
   * `"container"` para enfocar el propio contenedor (debe tener `tabIndex={-1}`). Por defecto, el primer elemento enfocable.
   */
  initialFocus?: RefObject<HTMLElement | null> | string | (() => HTMLElement | null | undefined);
  /** devolver el foco a quien abrió el diálogo al cerrarlo (por defecto sí); una función permite decidirlo en el cierre */
  restoreFocus?: boolean | (() => boolean);
  /** marca como `inert` el resto de la página mientras está activo (por defecto sí): no se puede tabular ni leer fuera */
  inertOthers?: boolean;
}

const visible = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

/** Elementos enfocables y visibles de un contenedor, en orden de tabulación. */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.tabIndex >= 0 && visible(el));
}

/**
 * Atrapa el foco dentro del contenedor al que se asigna la ref devuelta mientras `active` es true (diálogos, cajones, menús a pantalla completa):
 *  - Tab / Shift+Tab giran dentro del contenedor;
 *  - foco inicial dentro al activarse;
 *  - Escape llama a `onEscape`;
 *  - el resto de la página queda `inert` (no enfocable ni accesible para lectores de pantalla);
 *  - al desactivarse se restaura el foco en el elemento que lo tenía antes de abrir.
 * El contenedor debe estar en el DOM (aunque oculto) cuando `active` pasa a true.
 *
 * Uso: `const ref = useFocusTrap<HTMLDivElement>({ onEscape: close, initialFocus: closeBtnRef }); <div ref={ref} tabIndex={-1}>…`
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(options: FocusTrapOptions = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const active = options.active ?? true;
  // las opciones cambian en cada render: se leen desde una ref para no reiniciar el efecto
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // 1) el resto de la página, inert: se recorren los hermanos de cada ancestro del contenedor
    const inerted: HTMLElement[] = [];
    if (opts.current.inertOthers !== false) {
      for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) {
        const parent: HTMLElement | null = node.parentElement;
        if (!parent) break;
        for (const sib of Array.from(parent.children)) {
          if (sib === node || !(sib instanceof HTMLElement) || sib.hasAttribute("inert") || ["SCRIPT", "STYLE", "LINK"].includes(sib.tagName)) continue;
          sib.setAttribute("inert", "");
          inerted.push(sib);
        }
      }
    }

    // 2) foco inicial
    const initial = opts.current.initialFocus;
    const target =
      initial === "container" ? root
      : typeof initial === "string" ? root.querySelector<HTMLElement>(initial)
      : typeof initial === "function" ? initial()
      : initial ? initial.current
      : focusableIn(root)[0];
    const focusTarget = target ?? root;
    focusTarget.focus({ preventScroll: true });
    // si el panel aún está en transición (visibility: hidden → visible) el primer intento no enfoca: se reintenta en los próximos frames
    let raf = 0;
    let tries = 0;
    const retry = () => {
      if (document.activeElement === focusTarget || ++tries > 12) return;
      focusTarget.focus({ preventScroll: true });
      raf = requestAnimationFrame(retry);
    };
    if (document.activeElement !== focusTarget) raf = requestAnimationFrame(retry);

    // 3) Escape y bucle de Tab
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.current.onEscape) {
        e.stopPropagation();
        opts.current.onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusableIn(root);
      if (nodes.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (!(current instanceof Node) || !root.contains(current)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (current === first || current === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      for (const el of inerted) el.removeAttribute("inert");
      const restore = opts.current.restoreFocus;
      const should = typeof restore === "function" ? restore() : restore !== false;
      if (should && opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
