"use client";

/** Scrolls to the top of the page (smooth scrolling is handled in CSS, honouring reduced motion). */
export function BackToTopButton({ label = "Volver arriba" }: { label?: string }) {
  return (
    <button
      type="button"
      data-testid="back-to-top"
      aria-label={label}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }}
      className="group/top font-condensed inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-dept-gray-500 transition-colors duration-300 ease-out-expo hover:text-dept-white focus-visible:text-dept-white"
    >
      {label}
      <span
        aria-hidden
        className="inline-block transition-transform duration-300 ease-out-expo group-hover/top:-translate-y-1"
      >
        ↑
      </span>
    </button>
  );
}
