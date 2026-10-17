"use client";

import { usePathname } from "next/navigation";

/**
 * Fixed bar shown while Draft Mode is on (the editor opened a preview link from the admin panel).
 * "Salir" hits /api/preview/exit, which turns Draft Mode off and returns to the same page.
 */
export function PreviewBar() {
  const pathname = usePathname();
  const href = `/api/preview/exit?path=${encodeURIComponent(pathname || "/")}`;

  return (
    <div
      role="status"
      data-testid="preview-bar"
      className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-3 bg-dept-white px-4 py-2.5 font-condensed text-[11px] tracking-[0.2em] text-dept-black"
    >
      <span aria-hidden className="inline-block size-2 bg-dept-red" />
      <span>Vista previa del borrador</span>
      <span aria-hidden>·</span>
      {/* plain <a>: a navigation to a route handler, not a client-side route */}
      <a href={href} className="underline underline-offset-4 hover:text-dept-red">
        Salir
      </a>
    </div>
  );
}
