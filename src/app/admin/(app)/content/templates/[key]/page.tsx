"use client";
import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/admin/content/TemplateEditor";
import { EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { useDoc } from "@/lib/admin/api/content";

export default function TemplateEditPage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = useDoc("template", key);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Plantilla no encontrada" />;
  return (<><PageHeader title={`Plantilla: ${data.title}`} breadcrumbs={[{ label: "Plantillas", href: "/admin/content/templates" }, { label: data.title }]} /><TemplateEditor key={data.key} doc={data} /></>);
}
