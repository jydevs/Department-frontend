import type { CSSProperties } from "react";
import { Marquee } from "@/components/ui/Marquee";
import { clsx } from "@/lib/clsx";

export interface MarqueeBandProps {
  id?: string;
  items: string[];
  /** seconds per loop */
  duration: number;
  /** band = coloured strip, outline = stroked text, plain = muted white text */
  variant: "band" | "outline" | "plain";
  size: "sm" | "md" | "lg";
  separator?: string;
  separatorColor?: string;
  backgroundColor?: string;
  textColor?: string;
  bordered: boolean;
  ariaLabel?: string;
}

const ITEM_SIZE: Record<MarqueeBandProps["size"], string> = {
  sm: "font-display text-[clamp(1rem,2vw,1.5rem)] leading-none",
  md: "font-display text-display-md",
  lg: "font-display text-[clamp(1.75rem,4.6vw,4.25rem)] leading-none",
};

const ITEM_TONE: Record<MarqueeBandProps["variant"], string> = {
  band: "",
  outline: "text-transparent [-webkit-text-stroke:1.5px_var(--dept-white)]",
  plain: "text-white/80",
};

/**
 * Infinite ticker strip. `band` is the white strip between the hero and the first section;
 * `outline` / `plain` are the bordered tickers used on the community and 404 pages.
 */
export function MarqueeBand({
  id,
  items,
  duration,
  variant,
  size,
  separator,
  separatorColor,
  backgroundColor,
  textColor,
  bordered,
  ariaLabel,
}: MarqueeBandProps) {
  if (items.length === 0) return null;
  const band = variant === "band";
  const style: CSSProperties = {};
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (textColor) style.color = textColor;

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      style={style}
      className={clsx(
        band ? "py-4 md:py-6" : "py-5 md:py-6",
        band && !backgroundColor && "bg-dept-white",
        band && !textColor && "text-dept-black",
        bordered && "border-y border-white/10",
      )}
    >
      <Marquee
        items={items}
        duration={duration}
        separator={separator}
        separatorColor={separatorColor}
        itemClassName={clsx(ITEM_SIZE[size], ITEM_TONE[variant])}
      />
    </div>
  );
}
