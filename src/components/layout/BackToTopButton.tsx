"use client";

/** Scrolls to the top of the page (smooth scrolling is handled in CSS, honouring reduced motion). */
export function BackToTopButton() {
  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0 })}
      className="group/top font-condensed inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-dept-gray-500 transition-colors duration-300 ease-out-expo hover:text-dept-white focus-visible:text-dept-white"
    >
      Volver arriba
      <span
        aria-hidden
        className="inline-block transition-transform duration-300 ease-out-expo group-hover/top:-translate-y-1"
      >
        ↑
      </span>
    </button>
  );
}
