"use client";

import { Link } from "@/lib/admin/navigation";
import { ArrowRight } from "lucide-react";
import { Card, ErrorState, NoAccess, PageHeader, Skeleton } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { useDocuments } from "@/lib/admin/api/content";
import { DocStatusBadges, publishedText } from "./doc-status";
import { TEMPLATE_META } from "./section-meta";

const ORDER = ["home", "collection", "product", "cart", "search", "404", "layout", "page"];

export function TemplatesView() {
  const canRead = useCan("content:read");
  const docs = useDocuments("template");
  if (!canRead) return <NoAccess permission="content:read" />;
  const items = [...(docs.data ?? [])].sort((a, b) => (ORDER.indexOf(a.key) + 100) % 100 - ((ORDER.indexOf(b.key) + 100) % 100));

  return (
    <>
      <PageHeader title="Plantillas" description="Cada plantilla define las secciones de una parte de la tienda. Edítalas, reordénalas y previsualiza antes de publicar." breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Plantillas" }]} />
      {docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
      ) : docs.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="templates-list">
          {items.map((d) => {
            const meta = TEMPLATE_META[d.key];
            return (
              <li key={d.id}>
                <Link href={`/content/templates/${encodeURIComponent(d.key)}`} className="group block h-full rounded-lg focus-visible:outline-offset-2">
                  <Card className="h-full transition group-hover:border-border-strong group-hover:bg-surface-2/40">
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-[15px]">{meta?.label ?? d.title ?? d.key}</h2>
                          <p className="mt-0.5 text-[13px] text-muted">{meta?.description ?? "Plantilla personalizada."}</p>
                        </div>
                        <ArrowRight aria-hidden size={16} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-text" />
                      </div>
                      <div className="mt-auto flex flex-col gap-1.5">
                        <DocStatusBadges item={d} />
                        <p className="text-xs text-muted">
                          <code>{d.key}</code> · {publishedText(d)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
