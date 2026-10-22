"use client";

import { Link } from "@/lib/admin/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronRight, Copy, Lock } from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { formatCop, formatDate, formatDateTime, relativeTime } from "@/lib/admin/format";
import { errorMessage, isForbidden } from "@/lib/admin/errors";
import { Button, LinkButton } from "./button";

/* ---------------- Card ---------------- */

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Acciones alineadas a la derecha del encabezado. */
  actions?: ReactNode;
  /** Quita el padding del cuerpo (para tablas a sangre). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
  as?: "section" | "div";
}

export function Card({ title, description, actions, flush, className, bodyClassName, children, as: Tag = "section" }: CardProps) {
  return (
    <Tag className={cn("rounded-lg border border-border bg-surface shadow-sm", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title ? <h2 className="text-[15px]">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children !== undefined && children !== null ? <div className={cn(!flush && "p-5", bodyClassName)}>{children}</div> : null}
    </Tag>
  );
}

/* ---------------- Badge ---------------- */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-muted",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  accent: "bg-accent/15 text-accent-text",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap", toneClasses[tone], className)}>
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  // genéricos
  draft: { label: "Borrador", tone: "neutral" },
  active: { label: "Activo", tone: "success" },
  archived: { label: "Archivado", tone: "neutral" },
  published: { label: "Publicado", tone: "success" },
  scheduled: { label: "Programado", tone: "info" },
  inactive: { label: "Inactivo", tone: "neutral" },
  enabled: { label: "Activado", tone: "success" },
  disabled: { label: "Desactivado", tone: "neutral" },
  // pedidos
  open: { label: "Abierto", tone: "info" },
  closed: { label: "Cerrado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
  canceled: { label: "Cancelado", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
  paid: { label: "Pagado", tone: "success" },
  partially_paid: { label: "Pago parcial", tone: "warning" },
  failed: { label: "Fallido", tone: "danger" },
  refunded: { label: "Reembolsado", tone: "neutral" },
  partially_refunded: { label: "Reembolso parcial", tone: "warning" },
  "refund-pending": { label: "Reembolso pendiente", tone: "warning" },
  refund_pending: { label: "Reembolso pendiente", tone: "warning" },
  unfulfilled: { label: "Sin enviar", tone: "warning" },
  partially_fulfilled: { label: "Envío parcial", tone: "info" },
  partial: { label: "Parcial", tone: "info" },
  fulfilled: { label: "Enviado", tone: "success" },
  shipped: { label: "Enviado", tone: "info" },
  delivered: { label: "Entregado", tone: "success" },
  // mensajes / importaciones / otros
  new: { label: "Nuevo", tone: "info" },
  read: { label: "Leído", tone: "neutral" },
  replied: { label: "Respondido", tone: "success" },
  spam: { label: "Spam", tone: "danger" },
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "En curso", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  succeeded: { label: "Completado", tone: "success" },
  subscribed: { label: "Suscrito", tone: "success" },
  unsubscribed: { label: "Baja", tone: "neutral" },
  expired: { label: "Caducado", tone: "danger" },
};

function humanize(s: string): string {
  const t = s.replace(/[_-]+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

/** Insignia de estado con etiqueta en español y tono según el valor del API. */
export function StatusBadge({ status, label, tone }: { status: string | null | undefined; label?: string; tone?: BadgeTone }) {
  const key = (status ?? "").toLowerCase();
  const known = STATUS_MAP[key];
  return (
    <Badge tone={tone ?? known?.tone ?? "neutral"} dot>
      {label ?? known?.label ?? humanize(status ?? "")}
    </Badge>
  );
}

/* ---------------- EmptyState / ErrorState / NoAccess ---------------- */

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">{icon}</div> : null}
      <h3 className="text-base">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Estado de error de una consulta; un 403 se muestra como falta de permiso. */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const forbidden = isForbidden(error);
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">{forbidden ? <Lock aria-hidden size={22} /> : <AlertTriangle aria-hidden size={22} />}</div>
      <h3 className="text-base">{forbidden ? "No tienes acceso" : "No se pudo cargar"}</h3>
      <p className="max-w-md text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && !forbidden ? (
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

/** Pantalla completa para cuando falta un permiso. */
export function NoAccess({ permission, title = "No tienes acceso a esta sección" }: { permission?: string; title?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Lock aria-hidden size={24} />
      </div>
      <h1 className="text-xl">{title}</h1>
      <p className="text-sm text-muted">
        Tu rol actual no incluye este permiso{permission ? <> (<code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">{permission}</code>)</> : null}. Pide a un administrador que lo
        habilite si lo necesitas.
      </p>
      <LinkButton href="/" variant="secondary">
        Volver al inicio
      </LinkButton>
    </div>
  );
}

/* ---------------- PageHeader ---------------- */

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Crumb[]; meta?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3">
      {breadcrumbs?.length ? (
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            {breadcrumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden size={13} /> : null}
                {c.href ? (
                  <Link href={c.href} className="rounded hover:text-text hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl leading-tight">{title}</h1>
            {meta}
          </div>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/* ---------------- Kbd / CopyButton / JsonView / Money / DateTime ---------------- */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-2 px-1 font-mono text-[11px] text-muted", className)}>{children}</kbd>;
}

export function CopyButton({ value, label = "Copiar", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <Button
      size="sm"
      variant="secondary"
      className={className}
      leftIcon={copied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1800);
        } catch {
          /* portapapeles no disponible */
        }
      }}
      aria-live="polite"
    >
      {copied ? "Copiado" : label}
    </Button>
  );
}

/** Vista de solo lectura de un valor JSON como texto plano (sin HTML). */
export function JsonView({ value, className, maxHeight = 360 }: { value: unknown; className?: string; maxHeight?: number }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    text = String(value);
  }
  return (
    <pre tabIndex={0} style={{ maxHeight }} className={cn("overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words", className)}>
      {text}
    </pre>
  );
}

export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatCop(value)}</span>;
}

export function DateTime({ value, mode = "datetime", className }: { value: string | number | Date | null | undefined; mode?: "date" | "datetime" | "relative"; className?: string }) {
  if (value === null || value === undefined || value === "") return <span className={className}>—</span>;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return <span className={className}>—</span>;
  const full = formatDateTime(value);
  const iso = parsed.toISOString();
  return (
    <time dateTime={iso} title={mode === "relative" ? full : undefined} className={className}>
      {mode === "date" ? formatDate(value) : mode === "relative" ? relativeTime(value) : full}
    </time>
  );
}
