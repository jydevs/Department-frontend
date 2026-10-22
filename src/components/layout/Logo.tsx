/* Drawn script wordmark (text editable in settings/site → brand.logoText) or the uploaded logo image (brand.logoMediaUrl). */

import Image from "next/image";
import { canOptimize } from "@/lib/api/media";
import { clsx } from "@/lib/clsx";

interface LogoProps {
  /**
   * "red" = ornate graffiti signature used over dark / image backgrounds.
   * "black" = classic thin script used on light backgrounds (account pages).
   * @default "red"
   */
  variant?: "red" | "black";
  /**
   * Visual size (approx. cap height): sm ~20px, md ~28px, lg ~44px.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** brand logo uploaded in the CMS (settings/site → brand.logoMediaUrl); replaces the script wordmark */
  imageUrl?: string;
  /** accessible name (brand name) */
  title?: string;
  /** text of the drawn wordmark (settings/site → brand.logoText) */
  text?: string;
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 20,
  md: 28,
  lg: 44,
};

const VIEWBOX_W = 160;
const VIEWBOX_H = 48;

export function Logo({ variant = "red", size = "md", className, imageUrl, title = "Daregular Dept.", text = "Dept" }: LogoProps) {
  const height = SIZE_MAP[size];
  const width = (height * VIEWBOX_W) / VIEWBOX_H;
  const isRed = variant === "red";

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        unoptimized={!canOptimize(imageUrl)}
        alt={title}
        width={Math.round(width)}
        height={height}
        priority
        className={clsx("block select-none object-contain", className)}
      />
    );
  }

  return (
    <svg
      role="img"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      width={width}
      height={height}
      overflow="visible"
      className={clsx("block select-none", className)}
      style={{ color: isRed ? "var(--dept-red)" : "var(--dept-black)" }}
    >
      <title>{title}</title>
      <g transform={isRed ? `rotate(-4 ${VIEWBOX_W / 2} ${VIEWBOX_H / 2})` : undefined}>
        <text
          x={VIEWBOX_W / 2}
          y={VIEWBOX_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          stroke={isRed ? "currentColor" : undefined}
          strokeWidth={isRed ? 1.1 : undefined}
          paintOrder="stroke"
          fontFamily="var(--theme-font-script, var(--font-pinyon)), 'Brush Script MT', cursive"
          fontSize={44}
          fontWeight={isRed ? 600 : 400}
          letterSpacing={isRed ? -1 : 1}
          // a longer brand text is squeezed into the logo box instead of overflowing the header
          {...(text.length > 6 ? { textLength: VIEWBOX_W, lengthAdjust: "spacingAndGlyphs" } : null)}
        >
          {text}
        </text>
      </g>
    </svg>
  );
}
