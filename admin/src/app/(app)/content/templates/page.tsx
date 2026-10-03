"use client";
import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/Display";
import { docStatus, useDocs } from "@/lib/api/content";
import type { Section } from "@/lib/types";

export default function TemplatesPage() {
  const { data, isLoading } = useDocs();
  const tpls = data?.filter((d) => d.kind === "template");
  return (
    <>
      <PageHeader title="Plantillas" description="Home, colección, producto, carrito, búsqueda y 404." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }, (_, i) => <Card key={i}><Skeleton className="h-16" /></Card>)}
        {tpls?.map((t) => { const s = docStatus(t); const n = ((t.draft as { sections?: Section[] }).sections ?? []).length; return (
          <Link key={t.key} href={`/content/templates/${t.key}`} className="rounded-xl border border-line bg-surface p-4 hover:border-accent">
            <div className="flex items-start justify-between"><LayoutTemplate className="size-5 text-muted" aria-hidden />{s === "scheduled" ? <Badge tone="info">Programada</Badge> : s === "dirty" ? <Badge tone="warn">Cambios sin publicar</Badge> : s === "draft-unpublished" ? <Badge tone="warn">Borrador</Badge> : <Badge tone="ok">Publicada</Badge>}</div>
            <p className="mt-3 font-semibold">{t.title}</p><p className="text-xs text-muted">{n} secciones · versión {t.version || "—"}</p>
          </Link>); })}
      </div>
    </>
  );
}
