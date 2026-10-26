"use client";
import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { docStatus, useDocs } from "@/lib/admin/api/content";
import { EmptyState } from "@/components/admin/ui/Display";
import { errorMessage } from "@/lib/admin/errors";

export default function TemplatesPage() {
  const { data, isLoading, error } = useDocs();
  const tpls = data?.filter((d) => d.kind === "template");
  return (
    <>
      <PageHeader title="Plantillas" description="Layout global (cabecera y pie), home, colección, producto, carrito, búsqueda, 404 y plantilla de páginas." />
      {error && <EmptyState title="No se pudieron cargar las plantillas" text={errorMessage(error)} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }, (_, i) => <Card key={i}><Skeleton className="h-16" /></Card>)}
        {tpls?.map((t) => { const s = docStatus(t); return (
          <Link key={t.key} href={`/admin/content/templates/${t.key}`} className="rounded-sm border border-line bg-surface p-4 hover:border-accent">
            <div className="flex items-start justify-between"><LayoutTemplate className="size-5 text-muted" aria-hidden />{s === "scheduled" ? <Badge tone="info">Programada</Badge> : s === "dirty" ? <Badge tone="warn">Cambios sin publicar</Badge> : s === "draft-unpublished" ? <Badge tone="warn">Borrador</Badge> : <Badge tone="ok">Publicada</Badge>}</div>
            <p className="mt-3 font-semibold">{t.title}</p><p className="text-xs text-muted">{t.key} · {t.publishedAt ? "publicada" : "sin publicar"}</p>
          </Link>); })}
      </div>
    </>
  );
}
