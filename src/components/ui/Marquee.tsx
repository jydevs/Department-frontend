import { clsx } from "@/lib/clsx";

interface MarqueeProps {
  items: string[];
  /** seconds for one full loop */
  duration?: number;
  reverse?: boolean;
  /** glyph between items */
  separator?: string;
  className?: string;
  /** item typography, e.g. "font-display text-6xl" */
  itemClassName?: string;
  pauseOnHover?: boolean;
}

/**
 * Infinite CSS ticker. The track is rendered twice (second copy aria-hidden)
 * and translated by -50% for a seamless loop. Static under reduced motion.
 */
export function Marquee({
  items,
  duration = 40,
  reverse = false,
  separator = "✦",
  className,
  itemClassName,
  pauseOnHover = true,
}: MarqueeProps) {
  const track = (hidden: boolean) => (
    <ul
      className="marquee-track flex shrink-0 items-center"
      aria-hidden={hidden || undefined}
    >
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex shrink-0 items-center">
          <span className={clsx("whitespace-nowrap px-[0.6em]", itemClassName)}>{item}</span>
          <span aria-hidden className="text-dept-red px-[0.4em] leading-none">
            {separator}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={clsx("marquee group overflow-hidden", pauseOnHover && "marquee-pausable", className)}
      style={{ ["--marquee-duration" as string]: `${duration}s` }}
    >
      <div className={clsx("marquee-inner flex w-max", reverse && "marquee-reverse")}>
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
