import { Skeleton } from "@/components/ui/Skeleton";

/** Esqueleto de página del CMS: cabecera + cuerpo de texto. */
export default function PageLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="min-h-[70svh] px-gutter pt-[calc(var(--chrome-h)+3rem)]">
      <span className="sr-only">Cargando la página…</span>
      <Skeleton className="h-16 w-2/3 max-w-2xl md:h-28" />
      <Skeleton className="mt-10 h-5 w-full max-w-xl" />
      <Skeleton className="mt-3 h-5 w-5/6 max-w-xl" />
    </div>
  );
}
