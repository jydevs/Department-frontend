import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "solid" | "outline" | "red";
type Size = "md" | "lg";

interface CommonProps {
  variant?: Variant;
  /** colour set for the surface the button sits on */
  tone?: "onDark" | "onLight";
  size?: Size;
  /** show the animated → */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

type NativeRest = Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;
interface LinkRest {
  href: string;
  onClick?: () => void;
  "aria-label"?: string;
}

type ButtonProps = CommonProps & (NativeRest & { href?: undefined }) | CommonProps & LinkRest;

const base =
  "group/btn inline-flex items-center justify-center gap-3 font-condensed tracking-[0.12em] " +
  "transition-[background-color,color,border-color,transform] duration-300 ease-out-expo " +
  "disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-px";

const sizes: Record<Size, string> = {
  md: "h-11 px-6 text-xs",
  lg: "h-14 px-9 text-sm",
};

const variants: Record<"onDark" | "onLight", Record<Variant, string>> = {
  onDark: {
    solid: "bg-dept-white text-dept-black border border-dept-white hover:bg-dept-red hover:border-dept-red hover:text-dept-white",
    outline: "border border-dept-white/40 text-dept-white hover:bg-dept-white hover:text-dept-black hover:border-dept-white",
    red: "bg-dept-red text-dept-white border border-dept-red hover:bg-dept-white hover:text-dept-black hover:border-dept-white",
  },
  onLight: {
    solid: "bg-dept-black text-dept-white border border-dept-black hover:bg-dept-red hover:border-dept-red",
    outline: "border border-dept-black/30 text-dept-black hover:bg-dept-black hover:text-dept-white hover:border-dept-black",
    red: "bg-dept-red text-dept-white border border-dept-red hover:bg-dept-black hover:border-dept-black",
  },
};

function Arrow() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-1"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Hard-edged CTA. Renders a <Link> when `href` is given, a <button> otherwise. */
export function Button({
  variant = "solid",
  tone = "onDark",
  size = "md",
  arrow = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = clsx(base, sizes[size], variants[tone][variant], className);

  if (typeof (rest as LinkRest).href === "string") {
    const { href, onClick, "aria-label": ariaLabel } = rest as LinkRest;
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={cls}>
        {children}
        {arrow && <Arrow />}
      </Link>
    );
  }

  return (
    <button type="button" {...(rest as NativeRest)} className={cls}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
