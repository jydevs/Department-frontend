"use client";

import { useMemo } from "react";
import { encodeQr } from "./qr";

/** QR como SVG (siempre negro sobre blanco con margen, legible en ambos temas). */
export function QrCode({ value, size = 200, label = "Código QR" }: { value: string; size?: number; label?: string }) {
  const result = useMemo(() => {
    try {
      return { modules: encodeQr(value), error: null as string | null };
    } catch (e) {
      return { modules: null, error: e instanceof Error ? e.message : "No se pudo generar el QR" };
    }
  }, [value]);

  if (!result.modules) {
    return (
      <p role="alert" className="text-sm text-danger">
        {result.error}. Usa el secreto manual.
      </p>
    );
  }
  const n = result.modules.length;
  const quiet = 4;
  let d = "";
  result.modules.forEach((row, y) => {
    let x = 0;
    while (x < n) {
      if (!row[x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < n && row[x + run]) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges" className="rounded-md bg-white">
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
