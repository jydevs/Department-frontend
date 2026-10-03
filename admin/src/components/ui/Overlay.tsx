"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Input } from "./Form";

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select, button:not([data-close])")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  return ref;
}

interface DlgProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }
export function Dialog({ open, onClose, title, children, footer, size = "md" }: DlgProps) {
  const ref = useModal(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={clsx("relative flex max-h-[90vh] w-full flex-col rounded-xl border border-line bg-surface shadow-2xl", { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" }[size])}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={id} className="font-semibold">{title}</h2>
          <button type="button" data-close aria-label="Cerrar" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2"><X className="size-4" /></button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: Omit<DlgProps, "size">) {
  const ref = useModal(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={id} className="font-semibold">{title}</h2>
          <button type="button" data-close aria-label="Cerrar" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2"><X className="size-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

interface ConfirmOpts { title: string; message: string; confirmLabel?: string; danger?: boolean; /** Pide escribir esta palabra para confirmar. */ typeToConfirm?: string }
type ConfirmFn = (o: ConfirmOpts) => Promise<boolean>;
const CCtx = createContext<ConfirmFn | null>(null);
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => { setTyped(""); setSt({ ...o, resolve }); }), []);
  const close = (v: boolean) => { st?.resolve(v); setSt(null); };
  return (
    <CCtx.Provider value={confirm}>
      {children}
      <Dialog open={!!st} onClose={() => close(false)} title={st?.title ?? ""} size="sm"
        footer={<><Button onClick={() => close(false)}>Cancelar</Button><Button variant={st?.danger ? "danger" : "primary"} disabled={!!st?.typeToConfirm && typed !== st.typeToConfirm} onClick={() => close(true)}>{st?.confirmLabel ?? "Confirmar"}</Button></>}>
        <p className="text-sm text-muted">{st?.message}</p>
        {st?.typeToConfirm && <div className="mt-3"><Input label={`Escribe "${st.typeToConfirm}" para confirmar`} value={typed} onChange={(e) => setTyped(e.target.value)} /></div>}
      </Dialog>
    </CCtx.Provider>
  );
}
export function useConfirm(): ConfirmFn {
  const c = useContext(CCtx);
  if (!c) throw new Error("useConfirm fuera de ConfirmProvider");
  return c;
}
