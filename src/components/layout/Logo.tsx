/* Stand-in wordmark. Replace with the official DEPT / Dept vector assets — see docs/ASSETS.md. */

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
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 20,
  md: 28,
  lg: 44,
};

const VIEWBOX_W = 160;
const VIEWBOX_H = 48;

export function Logo({ variant = "red", size = "md", className }: LogoProps) {
  const height = SIZE_MAP[size];
  const width = (height * VIEWBOX_W) / VIEWBOX_H;
  const isRed = variant === "red";

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
      <title>Daregular Dept.</title>
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
          fontFamily="var(--font-pinyon), 'Brush Script MT', cursive"
          fontSize={44}
          fontWeight={isRed ? 600 : 400}
          letterSpacing={isRed ? -1 : 1}
        >
          Dept
        </text>
      </g>
    </svg>
  );
}
