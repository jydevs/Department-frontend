"use client";

import { ImageOff } from "lucide-react";
import { mediaSrc } from "@/lib/admin/api/products";
import { cn } from "@/lib/admin/utils";

/** Miniatura cuadrada; si la URL no es válida o no hay imagen muestra un marcador. */
export function Thumb({ url, alt, size = 40, className, rounded = "rounded-md" }: { url: string | null | undefined; alt?: string | null; size?: number; className?: string; rounded?: string }) {
  const src = mediaSrc(url);
  return (
    <span style={{ width: size, height: size }} className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-border bg-surface-2 text-muted", rounded, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} loading="lazy" className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden size={Math.max(14, Math.round(size / 2.5))} />
      )}
    </span>
  );
}
