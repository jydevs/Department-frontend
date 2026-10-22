import { Construction } from "lucide-react";
import { EmptyState, PageHeader, type Crumb } from "@/components/admin/ui/display";

/** Marcador de posición de las pantallas aún no construidas. Los módulos lo reemplazan por completo. */
export function ComingSoon({ title, breadcrumbs }: { title: string; breadcrumbs?: Crumb[] }) {
  return (
    <>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState icon={<Construction aria-hidden size={22} />} title="Próximamente" description="Esta sección se está construyendo y estará disponible muy pronto." />
      </div>
    </>
  );
}
