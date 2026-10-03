"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Límite de error de ruta: conserva cabecera y pie y reemplaza el cuerpo de la página.
 * `retry()` vuelve a pedir y renderizar la ruta en el servidor (a diferencia de `reset()`, que solo limpia el estado),
 * así que sirve cuando el fallo fue una caída momentánea de la API.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      aria-labelledby="error-title"
      className="flex min-h-[80svh] flex-col justify-center px-gutter pb-section pt-[calc(var(--chrome-h)+3rem)]"
    >
      <p className="font-condensed mb-6 flex items-center gap-3 text-[11px] tracking-[0.28em] text-dept-gray-300">
        <span aria-hidden className="h-px w-10 bg-dept-red" />
        Error
      </p>
      <h1 id="error-title" className="font-display text-display-2xl text-dept-white">
        Algo <span className="text-outline">salió mal</span>
      </h1>
      <p className="mt-8 max-w-md text-dept-white/70">
        No pudimos cargar esta página. Puede ser un problema momentáneo: reintenta o vuelve al inicio.
      </p>
      {error.digest && (
        <p className="font-condensed mt-4 text-[11px] tracking-[0.2em] text-dept-gray-500">
          Ref. {error.digest}
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button variant="red" size="lg" arrow onClick={retry}>
          Reintentar
        </Button>
        <Button href="/" variant="outline" size="lg">
          Volver al inicio
        </Button>
      </div>
    </section>
  );
}
