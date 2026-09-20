"use client";

/**
 * SCAFFOLD STUB — fleshed out in `feature/search-overlay`.
 * Full-screen search opened from the header magnifier. API: `open` / `onClose`.
 */
interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-dept-black/95 p-6 text-dept-white" role="dialog" aria-modal="true" aria-label="Buscar">
      <button type="button" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}
