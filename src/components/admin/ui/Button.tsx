"use client";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const V: Record<Variant, string> = {
  primary: "bg-accent text-white border border-accent hover:bg-fg hover:text-bg hover:border-fg",
  secondary: "bg-surface2 text-fg border border-line hover:border-muted",
  ghost: "text-fg hover:bg-surface2",
  danger: "bg-transparent text-red-500 border border-red-500/50 hover:bg-red-500/10",
};
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; size?: "sm" | "md"; icon?: ReactNode }

export function Button({ variant = "secondary", loading, size = "md", icon, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx("font-condensed inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-[0.1em] whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-8 px-3 text-[11px]" : "h-9 px-4 text-xs", V[variant], className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={clsx("inline-flex size-9 items-center justify-center rounded-sm text-muted hover:bg-surface2 hover:text-fg disabled:opacity-50", className)} {...rest}>
      {children}
    </button>
  );
}
