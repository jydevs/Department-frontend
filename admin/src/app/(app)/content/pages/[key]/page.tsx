"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { TemplateEditor } from "@/components/content/TemplateEditor";
import { SeoPreview } from "@/components/products/SeoPreview";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/Display";
import { Input, Textarea } from "@/components/ui/Form";
import { useDoc, useSaveDraft } from "@/lib/api/content";
import type { ContentDoc } from "@/lib/types";

function SeoCard({ doc }: { doc: ContentDoc }) {
  const save = useSaveDraft();
  const [t, setT] = useState(doc.seoTitle ?? ""), [d, setD] = useState(doc.seoDescription ?? "");
  const commit = () => save.mutate({ kind: doc.kind, key: doc.key, draft: doc.draft, seoTitle: t, seoDescription: d });
  return (
    <Card title="SEO de la página" className="mb-4"><div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3"><Input label="Título SEO" value={t} onChange={(e) => setT(e.target.value)} onBlur={commit} /><Textarea label="Descripción SEO" rows={2} value={d} onChange={(e) => setD(e.target.value)} onBlur={commit} /></div>
      <SeoPreview title={t || doc.title} description={d} handle={doc.key} base="daregulardept.com/pages" />
    </div></Card>
  );
}

export default function PageEditPage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = useDoc("page", key);
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Página no encontrada" />;
  return (<><PageHeader title={data.title} breadcrumbs={[{ label: "Páginas", href: "/content/pages" }, { label: data.title }]} /><TemplateEditor key={data.key} doc={data} extra={<SeoCard doc={data} />} /></>);
}
