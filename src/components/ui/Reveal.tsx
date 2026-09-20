"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";

interface RevealProps {
  children: ReactNode;
  /** stagger in ms */
  delay?: number;
  as?: ElementType;
  className?: string;
}

/**
 * Fades + lifts its content in when it scrolls into view.
 *
 * The SSR markup is fully visible (no-JS safe). On hydration the element is
 * flagged `data-reveal="pending"` and flipped to `"in"` by an
 * IntersectionObserver — all via the DOM, no React state. Disabled for
 * `prefers-reduced-motion` in CSS (see globals.css). Don't use above the fold.
 */
export function Reveal({ children, delay = 0, as: Tag = "div", className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.reveal = "in";
      return;
    }
    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "in";
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={clsx("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
