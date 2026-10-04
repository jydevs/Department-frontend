"use client";
import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/admin/content/TemplateEditor";
import { EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { useDoc } from "@/lib/admin/api/content";
import { errorMessage } from "@/lib/admin/errors";

export default function TemplateEditPage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading, error } = useDoc("template", key);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title={error ? "Plantilla no encontrada" : "Sin datos"} text={error ? errorMessage(error) : undefined} />;
  return (<><PageHeader title={data.title} breadcrumbs={[{ label: "Plantillas", href: "/admin/content/templates" }, { label: data.title }]} /><TemplateEditor key={data.key} doc={data} /></>);
}
