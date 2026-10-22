"use client";

import { Link } from "@/lib/admin/navigation";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, Ref } from "react";
import { cn } from "@/lib/admin/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface-2 text-text hover:bg-surface-3",
  ghost: "text-text hover:bg-surface-2",
  danger: "border border-danger/50 bg-transparent text-danger hover:bg-danger/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra spinner y deshabilita el botón. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = "secondary", size = "md", loading = false, leftIcon, rightIcon, className, children, disabled, type = "button", ref, ...rest }: ButtonProps) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...rest}>
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** Enlace de Next con aspecto de botón. */
export function LinkButton({ variant = "secondary", size = "md", className, leftIcon, rightIcon, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Texto accesible obligatorio (aria-label y tooltip). */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ label, icon, variant = "ghost", size = "md", loading, className, disabled, type = "button", ref, ...rest }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cn(
        base,
        variants[variant],
        size === "sm" ? "size-8" : "size-9",
        "shrink-0 p-0",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}
    </button>
  );
}
