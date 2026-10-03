import { Skeleton } from "@/components/ui/Skeleton";

/** Esqueleto de producto: foto (60%) + panel de datos (40%) con las alturas de la ficha real. */
export default function ProductLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="pt-[var(--chrome-h)]">
      <span className="sr-only">Cargando el producto…</span>
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-start" aria-hidden>
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="px-gutter pb-14 pt-8 lg:pt-6">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-8 h-12 w-3/4" />
          <Skeleton className="mt-5 h-8 w-40" />
          <Skeleton className="mt-6 h-20 w-full max-w-prose" />
          <div className="mt-8 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-12" />
            ))}
          </div>
          <Skeleton className="mt-8 h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
