"use client";

import { useSyncExternalStore } from "react";

/**
 * Scroll-driven state for the fixed header, as an external store so it is
 * hydration-safe and never calls setState from an effect.
 *  - "top":    page is at (or very near) the top
 *  - "shown":  scrolled, header visible (scrolling up / short pause)
 *  - "hidden": scrolled past the fold while moving down
 */
export type ChromeState = "top" | "shown" | "hidden";

const TOP = 24;
const HIDE_AFTER = 160;
const DELTA = 6;

let state: ChromeState = "top";
let lastY = 0;
let ready = false;
let ticking = false;
const listeners = new Set<() => void>();

function init() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  lastY = window.scrollY;
  state = lastY < TOP ? "top" : "shown";
}

function update() {
  ticking = false;
  const y = Math.max(0, window.scrollY);
  const dy = y - lastY;
  let next: ChromeState = state;

  if (y < TOP) {
    next = "top";
  } else if (dy > DELTA && y > HIDE_AFTER) {
    next = "hidden";
  } else if (dy < -DELTA) {
    next = "shown";
  } else if (state === "top") {
    next = "shown";
  }

  if (Math.abs(dy) > DELTA || y < TOP) lastY = y;
  if (next !== state) {
    state = next;
    listeners.forEach((l) => l());
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(update);
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("scroll", onScroll);
  };
}

const getSnapshot = (): ChromeState => {
  init();
  return state;
};
const getServerSnapshot = (): ChromeState => "top";

export function useChromeState(): ChromeState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
