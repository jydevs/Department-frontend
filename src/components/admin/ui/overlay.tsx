"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Button } from "./button";
import { IconButton } from "./button";
import { Input } from "./inputs";

const noopSubscribe = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// pila de capas abiertas: solo la superior reacciona a Escape y atrapa el foco
const layerStack: string[] = [];

interface LayerOptions {
  open: boolean;
  onClose: () => void;
  dismissible: boolean;
}

function useLayer({ open, onClose, dismissible }: LayerOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    layerStack.push(id);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const autofocus = panel?.querySelector<HTMLElement>("[data-autofocus]");
    const first = autofocus ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (layerStack[layerStack.length - 1] !== id) return;
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = layerStack.indexOf(id);
      if (i >= 0) layerStack.splice(i, 1);
      if (!layerStack.length) document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, dismissible, id]);

  return panelRef;
}

/* ---------------- Dialog ---------------- */

const dialogSizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Pie con acciones (botones). */
  footer?: ReactNode;
  size?: keyof typeof dialogSizes;
  /** false: no se cierra con Escape ni con clic fuera (p. ej. mientras guarda). */
  dismissible?: boolean;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissible = true, className }: DialogProps) {
  const mounted = useMounted();
  const panelRef = useLayer({ open, onClose, dismissible });
  const titleId = useId();
  const descId = useId();
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden className="dept-anim-fade absolute inset-0 bg-overlay" onClick={() => dismissible && onClose()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn("dept-anim-pop relative flex max-h-[92dvh] w-full flex-col rounded-t-lg border border-border bg-surface shadow-lg outline-none sm:rounded-lg", dialogSizes[size], className)}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? <IconButton label="Cerrar" size="sm" icon={<X aria-hidden size={16} />} onClick={onClose} /> : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Drawer ---------------- */

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  /** Ancho máximo en px (por defecto 480). */
  width?: number;
  dismissible?: boolean;
  /** Oculta el encabezado con título (si el contenido trae el suyo; el título sigue siendo el nombre accesible). */
  hideHeader?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Drawer({ open, onClose, title, description, children, footer, side = "right", width = 480, dismissible = true, hideHeader, className, bodyClassName }: DrawerProps) {
  const mounted = useMounted();
  const panelRef = useLayer({ open, onClose, dismissible });
  const titleId = useId();
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="dept-anim-fade absolute inset-0 bg-overlay" onClick={() => dismissible && onClose()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className={cn(
          "absolute inset-y-0 flex w-full flex-col border-border bg-surface shadow-lg outline-none",
          side === "right" ? "dept-anim-right right-0 border-l" : "dept-anim-left left-0 border-r",
          className,
        )}
      >
        <header className={cn("flex items-start justify-between gap-3 border-b border-border px-5 py-4", hideHeader && "sr-only")}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {dismissible ? <IconButton label="Cerrar" size="sm" icon={<X aria-hidden size={16} />} onClick={onClose} /> : null}
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName ?? "px-5 py-4")}>{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- ConfirmDialog ---------------- */

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" pinta el botón en rojo (acciones destructivas). */
  tone?: "default" | "danger";
  /** Confirmación fuerte: el usuario debe escribir este texto para habilitar el botón. */
  requireText?: string;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "default", requireText, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const ok = !requireText || typed.trim() === requireText;
  return (
    <Dialog
      open={open}
      onClose={() => {
        setTyped("");
        onCancel();
      }}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button data-autofocus={requireText ? undefined : ""} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            className={tone === "danger" ? "bg-danger/10" : undefined}
            disabled={!ok}
            loading={loading}
            onClick={() => {
              setTyped("");
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {requireText ? (
        <Input
          data-autofocus=""
          label={
            <>
              Escribe <strong>{requireText}</strong> para confirmar
            </>
          }
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      ) : null}
    </Dialog>
  );
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false);
          return { ...options, resolve };
        });
      }),
    [],
  );
  const settle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        tone={pending?.tone}
        requireText={pending?.requireText}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (await confirm({ title, tone: "danger" })) …` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <Providers>");
  return ctx;
}

/* ---------------- Toast ---------------- */

export type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toastTone: Record<ToastTone, string> = {
  success: "border-success/50",
  error: "border-danger/60",
  info: "border-info/50",
  warning: "border-warning/50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, tone, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4500));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
      warning: (m) => show(m, "warning"),
    }),
    [show],
  );

  const dot: Record<ToastTone, string> = { success: "bg-success", error: "bg-danger", info: "bg-info", warning: "bg-warning" };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("dept-anim-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface px-4 py-3 shadow-md", toastTone[t.tone])}>
            <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[t.tone])} />
            <p className="min-w-0 flex-1 text-sm break-words">{t.message}</p>
            <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)} className="-mr-1 rounded p-0.5 text-muted hover:text-text">
              <X aria-hidden size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <Providers>");
  return ctx;
}
