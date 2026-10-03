"use client";
import Link from "next/link";
import { Badge, DateTime, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { DataTable } from "@/components/admin/ui/DataTable";
import { docStatus, useDocs } from "@/lib/admin/api/content";
import { useRouter } from "next/navigation";
import type { ContentDoc } from "@/lib/admin/types";

const KIND = { settings: "Ajustes", menu: "Menú", template: "Plantilla", page: "Página" } as const;
export const docHref = (d: ContentDoc): string => (d.kind === "settings" ? "/admin/content/settings" : d.kind === "menu" ? "/admin/content/menus" : d.kind === "template" ? `/admin/content/templates/${d.key}` : `/admin/content/pages/${d.key}`);

export default function ContentOverview() {
  const { data, isLoading } = useDocs();
  const router = useRouter();
  const counts = { unpublished: 0, scheduled: 0, dirty: 0 };
  data?.forEach((d) => { const s = docStatus(d); if (s === "draft-unpublished") counts.unpublished++; else if (s === "scheduled") counts.scheduled++; else if (s === "dirty") counts.dirty++; });
  return (
    <>
      <PageHeader title="Contenido" description="Estado de cada documento de la tienda: borrador, programado o publicado." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[["Nunca publicados", counts.unpublished, "warn"], ["Con cambios sin publicar", counts.dirty, "warn"], ["Programados", counts.scheduled, "info"]].map(([l, n, t]) => (
          <div key={l as string} className="rounded-sm border border-line bg-surface p-4"><p className="text-xs text-muted">{l}</p>{isLoading ? <Skeleton className="mt-2 h-7 w-10" /> : <p className="mt-1 text-2xl font-semibold">{n as number} <Badge tone={t as "warn" | "info"}>{t === "info" ? "programado" : "pendiente"}</Badge></p>}</div>
        ))}
      </div>
      <DataTable caption="Documentos de contenido" loading={isLoading} rows={data} rowKey={(d) => `${d.kind}:${d.key}`} onRowClick={(d) => router.push(docHref(d))}
        columns={[
          { key: "t", header: "Documento", sortValue: (d) => d.title, cell: (d) => <Link href={docHref(d)} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{d.title}</Link> },
          { key: "k", header: "Tipo", cell: (d) => KIND[d.kind] },
          { key: "s", header: "Estado", cell: (d) => { const s = docStatus(d); return s === "scheduled" ? <Badge tone="info">Programado</Badge> : s === "draft-unpublished" ? <Badge tone="warn">Borrador sin publicar</Badge> : s === "dirty" ? <Badge tone="warn">Cambios sin publicar</Badge> : <Badge tone="ok">Publicado</Badge>; } },
          { key: "v", header: "Versión", cell: (d) => d.version || "—" },
          { key: "p", header: "Última publicación", cell: (d) => (d.publishedAt ? <DateTime value={d.publishedAt} /> : "—") },
          { key: "x", header: "Programado para", cell: (d) => (d.scheduledAt ? <DateTime value={d.scheduledAt} /> : "—") },
        ]} />
    </>
  );
}
