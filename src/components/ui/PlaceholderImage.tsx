import Image from "next/image";
import { clsx } from "@/lib/clsx";

type Tone = "dark" | "light" | "accent" | "cold";

interface PlaceholderImageProps {
  /** short description of the real asset that belongs here (used as alt text) */
  label: string;
  /**
   * Real image URL. When set, the photo is rendered (object-cover) and the
   * placeholder box is skipped. When absent, the tinted stand-in is shown.
   */
  src?: string;
  /** CSS aspect-ratio, e.g. "3 / 4", "16 / 9", "1 / 1". Ignored when `fill`. */
  ratio?: string;
  tone?: Tone;
  className?: string;
  /** render the label visibly (default) or hide it for decorative fills */
  hideLabel?: boolean;
  /**
   * Fill the nearest positioned ancestor (`absolute inset-0`) instead of
   * sizing itself by `ratio`. Use for full-bleed backgrounds.
   */
  fill?: boolean;
  priority?: boolean;
}

const toneStyles: Record<Tone, string> = {
  dark: "bg-dept-gray-900 text-dept-gray-500",
  light: "bg-dept-gray-100 text-dept-gray-500",
  accent: "bg-dept-red-dark text-dept-white/70",
  cold: "bg-[#3f5a78] text-dept-white/70",
};

/**
 * Stand-in for a real photo / product render. Every image slot in the UI uses
 * this until the production assets are wired in (see docs/ASSETS.md).
 */
export function PlaceholderImage({
  label,
  src,
  ratio = "3 / 4",
  tone = "dark",
  className,
  hideLabel = false,
  fill = false,
  priority = false,
}: PlaceholderImageProps) {
  if (src) {
    return (
      <div
        style={fill ? undefined : { aspectRatio: ratio }}
        className={clsx(
          "overflow-hidden bg-dept-black",
          fill ? "absolute inset-0 h-full w-full" : "relative w-full",
          className,
        )}
      >
        <Image
          src={src}
          alt={label}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      style={fill ? undefined : { aspectRatio: ratio }}
      className={clsx(
        "flex items-center justify-center overflow-hidden",
        fill ? "absolute inset-0 h-full w-full" : "relative w-full",
        toneStyles[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 10px)",
        }}
      />
      {!hideLabel && (
        <span className="font-condensed relative px-4 text-center text-[11px] tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}
