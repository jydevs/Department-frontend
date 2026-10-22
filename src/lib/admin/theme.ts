"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
export const THEME_KEY = "dept-admin-theme";

/**
 * Script mínimo para <head>: fija data-theme antes de pintar (sin parpadeo).
 * Es una cadena estática propia (no contiene datos de la API).
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}`;

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* almacenamiento no disponible */
    }
    listeners.forEach((l) => l());
  }, []);
  const toggle = useCallback(() => setTheme(getSnapshot() === "dark" ? "light" : "dark"), [setTheme]);
  return { theme, setTheme, toggle };
}
