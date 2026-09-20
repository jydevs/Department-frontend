"use client";

import { SearchPanel } from "@/components/search/SearchPanel";

/**
 * Full-screen search opened from the header magnifier. API: `open` / `onClose`.
 *
 * The panel is only mounted while open, so its state (query, highlighted row)
 * resets on every open without any effect-driven setState. Body scroll lock is
 * handled by `OverlayProvider`.
 */
interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  if (!open) return null;
  return <SearchPanel onClose={onClose} />;
}
