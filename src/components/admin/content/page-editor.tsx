"use client";

import { useState } from "react";
import { useRouter } from "@/lib/admin/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/admin/ui";
import { STOREFRONT_URL, safeHref, storefrontLabel } from "@/lib/admin/utils";
import { truncate } from "@/lib/admin/format";
import { useDocument } from "@/lib/admin/api/content";
import { labelWithCount } from "./fields";
import { usePageDeletion } from "./pages-view";
import { SectionWorkspace } from "./section-workspace";
import type { DocumentEditor } from "./use-document-editor";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function PageSeoCard({ editor, handle }: { editor: DocumentEditor; handle: string }) {
  const data = editor.data ?? {};
  const disabled = !editor.canWrite;
  const set = (key: string, value: string, optional: boolean) =>
    editor.setData((d) => {
      const next = { ...d };
      if (optional && value === "") delete next[key];
      else next[key] = value;
      return next;
    });
  const title = str(data.title);
  const seoTitle = str(data.seoTitle);
  const seoDesc = str(data.seoDescription);
  const err = editor.errors;
  return (
    <Card className="mb-5" title="Datos y SEO" description="El título aparece en la página; el SEO controla cómo se ve en Google.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Input label={labelWithCount("Título de la página", title.length, 255)} required value={title} disabled={disabled} onChange={(e) => set("title", e.target.value, false)} error={err.title} />
          <Input label="Handle" value={handle} readOnly disabled hint="No se puede cambiar. Si necesitas otra dirección, crea una página nueva y una redirección." />
          <Input label={labelWithCount("Título SEO", seoTitle.length, 255)} value={seoTitle} disabled={disabled} onChange={(e) => set("seoTitle", e.target.value, true)} error={err.seoTitle} />
          <Textarea label={labelWithCount("Descripción SEO", seoDesc.length, 320)} rows={3} value={seoDesc} disabled={disabled} onChange={(e) => set("seoDescription", e.target.value, true)} error={err.seoDescription} />
        </div>
        <div aria-label="Vista previa en Google" className="rounded-lg border border-border bg-surface-2/50 p-4">
          <p className="mb-2 text-xs text-muted">Así podría verse en los resultados de búsqueda</p>
          <p className="truncate text-xs text-muted">{storefrontLabel()} › pages › {handle}</p>
          <p className="mt-0.5 truncate text-lg text-info">{seoTitle || title || handle}</p>
          <p className="mt-0.5 text-sm text-muted">{truncate(seoDesc || "Sin descripción: Google mostrará un fragmento del contenido de la página.", 160)}</p>
        </div>
      </div>
    </Card>
  );
}

export function PageEditor({ handle }: { handle: string }) {
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const deletion = usePageDeletion(
    () => setDeleted(true),
    () => router.push("/content/pages"),
  );
  // tras eliminar no se vuelve a pedir el documento (daría 404): solo queda el diálogo de redirección
  if (deleted) return deletion.dialog;
  return <PageEditorBody handle={handle} deletion={deletion} />;
}

function PageEditorBody({ handle, deletion }: { handle: string; deletion: ReturnType<typeof usePageDeletion> }) {
  const doc = useDocument("page", handle);
  const live = doc.data?.published ? safeHref(`${STOREFRONT_URL}/pages/${handle}`) : null;
  const title = doc.data?.title || handle;

  return (
    <>
      <SectionWorkspace
        kind="page"
        docKey={handle}
        title={title}
        description={<span className="font-mono text-xs">/pages/{handle}</span>}
        breadcrumbs={[{ label: "Contenido", href: "/content" }, { label: "Páginas", href: "/content/pages" }, { label: title }]}
        previewPath={`/pages/${handle}`}
        actions={
          <>
            {live ? (
              <a href={live} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-4 text-sm font-medium hover:bg-surface-3">
                Ver en la tienda <ExternalLink aria-hidden size={14} />
              </a>
            ) : null}
            <Button variant="danger" leftIcon={<Trash2 aria-hidden size={14} />} loading={deletion.busy} onClick={() => void deletion.run(handle, doc.data?.title)}>
              Eliminar
            </Button>
          </>
        }
        top={(editor) => <PageSeoCard editor={editor} handle={handle} />}
      />
      {deletion.dialog}
    </>
  );
}
