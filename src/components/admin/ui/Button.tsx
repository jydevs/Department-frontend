"use client";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const V: Record<Variant, string> = {
  primary: "bg-accent text-white border border-accent hover:bg-fg hover:text-bg hover:border-fg",
  secondary: "bg-transparent text-fg border border-fg/35 hover:bg-fg hover:text-bg hover:border-fg",
  ghost: "text-fg border border-transparent hover:border-fg/35",
  danger: "bg-transparent text-accent-text border border-accent/60 hover:bg-accent hover:text-white hover:border-accent",
};
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; size?: "sm" | "md"; icon?: ReactNode }

export function Button({ variant = "secondary", loading, size = "md", icon, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx("font-condensed inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-[0.12em] whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-10 px-3.5 text-[11px] lg:h-8" : "h-11 px-5 text-xs lg:h-10", V[variant], className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={clsx("inline-flex size-10 items-center justify-center rounded-sm text-muted hover:bg-surface2 hover:text-fg disabled:opacity-50 lg:size-9", className)} {...rest}>
      {children}
    </button>
  );
}
