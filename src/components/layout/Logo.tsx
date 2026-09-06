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
   * Visual size of the logo.
   * - sm: ~20px cap height
   * - md: ~28px cap height (default)
   * - lg: ~44px cap height
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: 20,
  md: 28,
  lg: 44,
};

export function Logo({
  variant = "red",
  size = "md",
  className,
}: LogoProps) {
  const heightPx = SIZE_MAP[size];
  const isRed = variant === "red";

  return (
    <svg
      role="img"
      viewBox="0 0 150 40"
      width="auto"
      height={heightPx}
      className={clsx("select-none", className)}
      style={{
        color: isRed ? "var(--dept-red)" : "var(--dept-black)",
      }}
    >
      <title>Daregular Dept.</title>
      <text
        x="75"
        y="32"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="var(--font-pinyon), 'Brush Script MT', cursive"
        fontSize="42"
        fontWeight={isRed ? "600" : "400"}
        letterSpacing={isRed ? "-2" : "1"}
        style={{
          paintOrder: isRed ? "stroke" : "normal",
          strokeWidth: isRed ? "1.2" : "0",
          stroke: isRed ? "currentColor" : "none",
          transform: isRed ? "rotate(-4deg)" : "none",
          transformOrigin: "center",
          dominantBaseline: "middle",
        }}
      >
        Dept
      </text>
    </svg>
  );
}
