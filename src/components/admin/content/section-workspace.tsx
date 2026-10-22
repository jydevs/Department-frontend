"use client";

import { useState, type ReactNode } from "react";
import { Columns2, PanelRightClose } from "lucide-react";
import { Button, ErrorState, NoAccess, PageHeader, Skeleton, Tabs, type Crumb } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import type { ContentKind } from "@/lib/admin/api/content";
import { cn } from "@/lib/admin/utils";
import { PreviewPane } from "./preview-pane";
import { PublishBar } from "./publish-bar";
import { SectionsEditor } from "./sections-editor";
import { useDocumentEditor, type DocumentEditor } from "./use-document-editor";

interface Props {
  kind: Extract<ContentKind, "template" | "page">;
  docKey: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs: Crumb[];
  previewPath: string;
  /** Acciones extra en la cabecera. */
  actions?: ReactNode;
  /** Contenido sobre el editor de secciones (p. ej. SEO de una página), recibe el controlador. */
  top?: (editor: DocumentEditor) => ReactNode;
}

/** Espacio de trabajo con secciones: cabecera, barra de publicación, editor de secciones y vista previa. */
export function SectionWorkspace({ kind, docKey, title, description, breadcrumbs, previewPath, actions, top }: Props) {
  const canRead = useCan("content:read");
  const editor = useDocumentEditor(kind, docKey);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [split, setSplit] = useState(true);

  if (!canRead) return <NoAccess permission="content:read" />;
  if (editor.isLoading) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <Skeleton className="mb-4 h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }
  if (editor.error || !editor.detail || !editor.data) {
    return (
      <>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <ErrorState error={editor.error ?? new Error("No se pudo cargar el documento")} onRetry={editor.refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} actions={actions} />
      <PublishBar kind={kind} docKey={docKey} editor={editor} />
      {!editor.canWrite ? <p className="mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted">Tienes acceso de solo lectura: puedes ver el contenido y la vista previa, pero no modificarlo.</p> : null}
      {top?.(editor)}
      <div className="mb-3 flex items-center justify-between gap-3">
        <Tabs
          className="xl:hidden"
          tabs={[
            { key: "edit", label: "Edición" },
            { key: "preview", label: "Vista previa" },
          ]}
          value={view}
          onChange={(k) => setView(k === "preview" ? "preview" : "edit")}
          aria-label="Modo de trabajo"
        />
        <Button size="sm" className="ml-auto hidden xl:inline-flex" leftIcon={split ? <PanelRightClose aria-hidden size={14} /> : <Columns2 aria-hidden size={14} />} onClick={() => setSplit((s) => !s)} aria-pressed={split}>
          {split ? "Ocultar vista previa" : "Mostrar vista previa"}
        </Button>
      </div>
      <div className={cn("grid gap-5", split && "xl:grid-cols-[minmax(0,1fr)_minmax(420px,40%)]")}>
        <div className={cn("min-w-0", view === "preview" && "hidden xl:block")}>
          <SectionsEditor editor={editor} />
        </div>
        <div className={cn("min-w-0 self-start xl:sticky xl:top-[calc(var(--topbar-h)+72px)]", view === "edit" && "hidden", split ? "xl:block" : "xl:hidden")}>
          <PreviewPane kind={kind} docKey={docKey} path={previewPath} reloadKey={editor.savedTick} dirty={editor.dirty} />
        </div>
      </div>
    </>
  );
}
