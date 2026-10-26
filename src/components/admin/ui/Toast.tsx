"use client";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface ToastItem { id: number; kind: "success" | "error"; text: string }
interface Api { success: (t: string) => void; error: (t: string) => void }
const Ctx = createContext<Api | null>(null);
let n = 0;
const DURATION = { success: 5000, error: 10000 } as const;

/** Un aviso: se cierra solo (éxito 5 s, error 10 s), pero el temporizador se detiene mientras el cursor o el foco están encima. */
function ToastView({ t, onClose }: { t: ToastItem; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const h = setTimeout(() => onClose(t.id), DURATION[t.kind]);
    return () => clearTimeout(h);
  }, [paused, t.id, t.kind, onClose]);
  return (
    <div role={t.kind === "error" ? "alert" : "status"} className="adm-toast-in flex items-start gap-2 rounded-sm border border-line bg-surface p-3 text-sm shadow-xl"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />}
      <span className="min-w-0 flex-1 break-words">{t.text}</span>
      <button type="button" aria-label="Cerrar aviso" onClick={() => onClose(t.id)} className="-m-1 p-1 text-muted hover:text-fg"><X className="size-4" /></button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const close = useCallback((id: number) => setItems((l) => l.filter((i) => i.id !== id)), []);
  const push = useCallback((kind: ToastItem["kind"], text: string) => {
    // un mismo aviso repetido (p. ej. error de diálogo + mutación) se muestra una sola vez
    const id = ++n;
    setItems((l) => [...l.filter((i) => !(i.kind === kind && i.text === text)), { id, kind, text }].slice(-4));
  }, []);
  const api = useMemo<Api>(() => ({ success: (t) => push("success", t), error: (t) => push("error", t) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label="Notificaciones">
        {items.map((t) => <ToastView key={t.id} t={t} onClose={close} />)}
      </div>
    </Ctx.Provider>
  );
}
export function useToast(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast fuera de ToastProvider");
  return c;
}
