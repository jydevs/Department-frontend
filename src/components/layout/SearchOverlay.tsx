"use client";

import type { Product } from "@/lib/catalog/types";
import { SearchPanel } from "@/components/search/SearchPanel";
import type { SearchConfig } from "@/components/search/config";

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
  config?: SearchConfig;
  popular?: Product[];
}

export function SearchOverlay({ open, onClose, config, popular }: SearchOverlayProps) {
  if (!open) return null;
  return <SearchPanel onClose={onClose} config={config} popular={popular} />;
}
