import { clsx } from "@/lib/clsx";

/** Bloque gris pulsante para los `loading.tsx`: reserva el tamaño real para que el contenido no salte al llegar. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse bg-dept-gray-900", className)} />;
}
