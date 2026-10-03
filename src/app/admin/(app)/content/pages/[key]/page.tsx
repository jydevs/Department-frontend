"use client";
import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/admin/content/TemplateEditor";
import { EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { useDoc } from "@/lib/admin/api/content";

export default function PageEditPage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = useDoc("page", key);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Página no encontrada" />;
  return (<><PageHeader title={data.title} breadcrumbs={[{ label: "Páginas", href: "/admin/content/pages" }, { label: data.title }]} /><TemplateEditor key={data.key} doc={data} /></>);
}
