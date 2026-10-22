"use client";

import { Link } from "@/lib/admin/navigation";
import { Button, buttonClasses } from "@/components/admin/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center text-text">
      <p className="text-sm font-medium text-muted">Algo salió mal</p>
      <h1 className="text-2xl font-semibold">No pudimos cargar esta pantalla</h1>
      <p className="max-w-sm text-sm text-muted">Ocurrió un error inesperado en el panel. Puedes reintentar o volver al inicio.</p>
      {error.digest ? <p className="text-xs text-muted">Ref: {error.digest}</p> : null}
      <div className="mt-2 flex gap-2">
        <Button variant="primary" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/" className={buttonClasses("secondary")}>
          Ir al panel
        </Link>
      </div>
    </main>
  );
}
