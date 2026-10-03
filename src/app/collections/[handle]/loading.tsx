import { Skeleton } from "@/components/ui/Skeleton";

/** Esqueleto de colección: cabecera de la altura real + barra de filtros + rejilla de tarjetas 4/5. */
export default function CollectionLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la colección…</span>
      <div className="flex min-h-[58svh] items-end px-gutter pb-8 pt-[calc(var(--chrome-h)+3rem)] md:pb-12">
        <Skeleton className="h-24 w-3/4 max-w-3xl md:h-40" />
      </div>
      <div className="h-[3.25rem] border-y border-white/10" aria-hidden />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-12 px-gutter pt-10 sm:grid-cols-3 md:gap-x-4 md:gap-y-16 md:pt-14 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </li>
        ))}
      </ul>
    </div>
  );
}
