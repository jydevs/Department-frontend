import type { Metadata } from "next";
import { Link } from "@/lib/admin/navigation";
import { buttonClasses } from "@/components/admin/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function AdminNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center text-text">
      <p className="text-sm font-medium text-muted">Error 404</p>
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted">La sección que buscas no existe en el panel de administración.</p>
      <Link href="/" className={buttonClasses("primary", "md", "mt-2")}>
        Ir al panel
      </Link>
    </main>
  );
}
