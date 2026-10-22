"use client";

import { Link } from "@/lib/admin/navigation";
import { ArrowRight, FileText, Image as ImageIcon, LayoutTemplate, Menu, Palette, Route } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, NoAccess, PageHeader, Skeleton } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { useDocuments, type DocListItem } from "@/lib/admin/api/content";
import { DocStatusBadges, publishedText } from "./doc-status";
import { TEMPLATE_META } from "./section-meta";

const TEMPLATE_ORDER = ["home", "collection", "product", "cart", "search", "404", "layout"];

function hrefFor(d: DocListItem): string {
  const k = encodeURIComponent(d.key);
  if (d.kind === "settings") return "/content/settings";
  if (d.kind === "menu") return `/content/menus/${k}`;
  if (d.kind === "template") return `/content/templates/${k}`;
  return `/content/pages/${k}`;
}

function labelFor(d: DocListItem): string {
  if (d.kind === "settings") return "Ajustes y tema";
  if (d.kind === "template") return TEMPLATE_META[d.key]?.label ?? d.title ?? d.key;
  return d.title ?? d.key;
}

const GROUPS: Array<{ kind: DocListItem["kind"]; title: string; description: string; icon: typeof Palette; allHref: string }> = [
  { kind: "settings", title: "Ajustes y tema", description: "Marca, colores, tipografías, SEO y anuncios.", icon: Palette, allHref: "/content/settings" },
  { kind: "menu", title: "Menús", description: "Navegación de la cabecera y del pie.", icon: Menu, allHref: "/content/menus" },
  { kind: "template", title: "Plantillas", description: "Secciones de cada parte de la tienda.", icon: LayoutTemplate, allHref: "/content/templates" },
  { kind: "page", title: "Páginas", description: "Páginas informativas con sus propias secciones.", icon: FileText, allHref: "/content/pages" },
];

export function ContentOverview() {
  const canRead = useCan("content:read");
  const docs = useDocuments();
  if (!canRead) return <NoAccess permission="content:read" />;

  const items = docs.data ?? [];
  const pending = items.filter((d) => d.hasUnpublishedChanges);
  const scheduled = items.filter((d) => d.scheduledAt);

  return (
    <>
      <PageHeader title="Contenido" description="Todo lo que ve el cliente en la tienda: diseño, menús, plantillas, páginas, imágenes y redirecciones." />
      {docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
      ) : docs.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3" data-testid="content-summary">
            <SummaryTile label="Documentos" value={items.length} />
            <SummaryTile label="Con borrador sin publicar" value={pending.length} tone={pending.length ? "warning" : undefined} />
            <SummaryTile label="Publicaciones programadas" value={scheduled.length} tone={scheduled.length ? "info" : undefined} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {GROUPS.map((g) => {
              let list = items.filter((d) => d.kind === g.kind);
              if (g.kind === "template") list = list.sort((a, b) => TEMPLATE_ORDER.indexOf(a.key) - TEMPLATE_ORDER.indexOf(b.key));
              const Icon = g.icon;
              return (
                <Card
                  key={g.kind}
                  title={g.title}
                  description={g.description}
                  flush
                  actions={
                    <Link href={g.allHref} className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                      Ver todo <ArrowRight aria-hidden size={13} />
                    </Link>
                  }
                >
                  {list.length === 0 ? (
                    <div className="p-5">
                      <EmptyState icon={<Icon aria-hidden size={20} />} title="Aún no hay documentos" description="Cuando existan aparecerán aquí con su estado." />
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {list.slice(0, 8).map((d) => (
                        <li key={d.id}>
                          <Link href={hrefFor(d)} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3 transition hover:bg-surface-2/50">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{labelFor(d)}</p>
                              <p className="text-xs text-muted">{publishedText(d)}</p>
                            </div>
                            <DocStatusBadges item={d} />
                          </Link>
                        </li>
                      ))}
                      {list.length > 8 ? (
                        <li className="px-5 py-2.5 text-xs text-muted">
                          y {list.length - 8} más · <Link href={g.allHref} className="text-accent hover:underline">ver todo</Link>
                        </li>
                      ) : null}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>

          <Card title="Biblioteca y redirecciones" description="Recursos compartidos por todo el sitio.">
            <div className="flex flex-wrap gap-3">
              <Link href="/media">
                <Button leftIcon={<ImageIcon aria-hidden size={14} />}>Biblioteca de medios</Button>
              </Link>
              <Link href="/redirects">
                <Button leftIcon={<Route aria-hidden size={14} />}>Redirecciones</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: "warning" | "info" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
        {value}
        {tone ? <Badge tone={tone}>{tone === "warning" ? "Pendiente" : "Programado"}</Badge> : null}
      </p>
    </div>
  );
}
