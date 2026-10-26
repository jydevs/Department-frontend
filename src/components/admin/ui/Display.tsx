"use client";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { formatDateTime, formatMoney } from "@/lib/admin/format";

export function Card({ title, actions, children, className, pad = true }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx("rounded-sm border border-line bg-surface", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          {title && <h2 className="adm-label !text-fg">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "accent";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface2 text-muted",
  ok: "bg-green-500/15 text-ok",
  warn: "bg-amber-500/15 text-warn",
  danger: "bg-accent/15 text-accent-text",
  info: "bg-blue-500/15 text-info",
  accent: "bg-accent/15 text-accent-text",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={clsx("font-condensed inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] whitespace-nowrap", TONES[tone])}>{children}</span>;
}
const STATUS: Record<string, [string, Tone]> = {
  paid: ["Pagado", "ok"], pending: ["Pendiente", "warn"], refunded: ["Reembolsado", "neutral"], "partially-refunded": ["Reembolso parcial", "info"], "refund-pending": ["Reembolso pendiente", "danger"],
  unfulfilled: ["Sin enviar", "warn"], partial: ["Envío parcial", "info"], fulfilled: ["Enviado", "ok"], cancelled: ["Cancelado", "neutral"],
  active: ["Activo", "ok"], draft: ["Borrador", "warn"], archived: ["Archivado", "neutral"], published: ["Publicado", "ok"], scheduled: ["Programado", "info"],
  new: ["Nuevo", "accent"], read: ["Leído", "neutral"], replied: ["Respondido", "ok"], subscribed: ["Suscrito", "ok"], unsubscribed: ["Baja", "neutral"],
  done: ["Completado", "ok"], failed: ["Falló", "danger"], running: ["En curso", "info"], queued: ["En cola", "warn"],
};
export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 role="status" aria-label="Cargando" className={clsx("size-5 animate-spin text-muted", className)} />;
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={clsx("adm-skel h-4 w-full", className)} />;

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

function useDocumentTitle(title: string) {
  useEffect(() => { document.title = `${title} · Panel Dept.`; }, [title]);
}

export function PageHeader({ title, actions, breadcrumbs, description }: { title: string; actions?: ReactNode; breadcrumbs?: { label: string; href?: string }[]; description?: string }) {
  useDocumentTitle(title);
  return (
    <div className="mb-5">
      {breadcrumbs && (
        <nav aria-label="Migas de pan" className="adm-label mb-2 flex items-center gap-1">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" aria-hidden />}
              {b.href ? <Link href={b.href} className="inline-block py-2 hover:text-fg">{b.label}</Link> : <span aria-current="page">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={clsx("font-display break-words", title.length > 26 ? "text-display-md" : "text-display-lg")}>{title}</h1>
          {description && <p className="mt-2 max-w-[60ch] text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</kbd>;

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" aria-label={label} title={label} className="inline-flex size-7 items-center justify-center rounded-sm text-muted hover:bg-surface2 hover:text-fg"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => undefined); }}>
      {ok ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
    </button>
  );
}
export function JsonView({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto rounded-sm bg-surface2 p-3 font-mono text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}
export const Money = ({ value, className }: { value: number; className?: string }) => <span className={clsx("tabular-nums", className)}>{formatMoney(value)}</span>;
export const DateTime = ({ value }: { value: string }) => <time dateTime={value} className="whitespace-nowrap">{formatDateTime(value)}</time>;

export function Tabs<K extends string>({ tabs, value, onChange, label = "Secciones" }: { tabs: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.key} role="tab" type="button" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={clsx("font-condensed -mb-px whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium tracking-[0.1em]", value === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-surface2 px-1.5 text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-muted">
      <span>{total} resultados</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)} className="grid size-10 place-items-center rounded-sm hover:bg-surface2 disabled:opacity-40 lg:size-8"><ChevronLeft className="size-4" /></button>
        <span aria-live="polite">Página {page} de {totalPages}</span>
        <button type="button" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="grid size-10 place-items-center rounded-sm hover:bg-surface2 disabled:opacity-40 lg:size-8"><ChevronRight className="size-4" /></button>
      </div>
    </nav>
  );
}
