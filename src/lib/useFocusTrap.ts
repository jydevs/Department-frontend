"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const visible = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

/**
 * Trampa de foco para diálogos modales (se monta mientras el diálogo está abierto):
 * - al abrir mueve el foco a `initialFocus` (o al primer elemento enfocable),
 * - Tab / Shift+Tab circulan dentro del contenedor,
 * - Escape llama a `onEscape`,
 * - al cerrar devuelve el foco al elemento que lo tenía antes.
 * Devuelve la `ref` que hay que poner en el contenedor del diálogo.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({ onEscape, initialFocus }: { onEscape?: () => void; initialFocus?: RefObject<HTMLElement | null> } = {}): RefObject<T | null> {
  const container = useRef<T | null>(null);
  const escape = useRef(onEscape);
  useEffect(() => {
    escape.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
    (initialFocus?.current ?? items()[0] ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        escape.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
    // se monta una sola vez por apertura del diálogo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return container;
}
