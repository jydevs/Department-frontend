import { clsx } from "@/lib/clsx";

interface LogoProps {
  /**
   * "red" = ornate graffiti signature used over dark / image backgrounds.
   * "black" = classic thin script used on light backgrounds (account pages).
   */
  variant?: "red" | "black";
  className?: string;
}

/**
 * SCAFFOLD STUB — placeholder wordmark using a script webfont.
 * Replace with the real "DEPT" / "Dept" logo assets (see docs/ASSETS.md).
 * Fleshed out by `feature/navbar`.
 */
export function Logo({ variant = "red", className }: LogoProps) {
  return (
    <span
      className={clsx(
        "font-script select-none text-3xl leading-none",
        variant === "red" ? "text-dept-red" : "text-dept-black",
        className,
      )}
    >
      Dept
    </span>
  );
}
