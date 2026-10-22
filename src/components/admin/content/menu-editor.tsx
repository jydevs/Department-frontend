"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, ErrorState, NoAccess, PageHeader, Skeleton } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import type { MenuItemData } from "@/lib/admin/api/content";
import { uid } from "./content-utils";
import { MENU_MAX_ITEMS, MenuTree, countItems, validateMenu } from "./menu-tree";
import { PreviewPane } from "./preview-pane";
import { PublishBar } from "./publish-bar";
import { useDocumentEditor } from "./use-document-editor";
import type { Obj } from "./content-utils";

function itemsOf(data: Obj | null): MenuItemData[] {
  return data && Array.isArray(data.items) ? (data.items as MenuItemData[]) : [];
}

export function MenuEditor({ menuKey }: { menuKey: string }) {
  const canRead = useCan("content:read");
  const editor = useDocumentEditor("menu", menuKey, { validate: (d) => validateMenu(itemsOf(d)) });
  const [showPreview, setShowPreview] = useState(false);

  const crumbs = [{ label: "Contenido", href: "/content" }, { label: "Menús", href: "/content/menus" }, { label: editor.detail?.title || menuKey }];
  if (!canRead) return <NoAccess permission="content:read" />;
  if (editor.isLoading) {
    return (
      <>
        <PageHeader title={`Menú: ${menuKey}`} breadcrumbs={crumbs} />
        <Skeleton className="h-80 w-full" />
      </>
    );
  }
  if (editor.error || !editor.data || !editor.detail) {
    return (
      <>
        <PageHeader title={`Menú: ${menuKey}`} breadcrumbs={crumbs} />
        <ErrorState error={editor.error ?? new Error("No se pudo cargar el menú")} onRetry={editor.refetch} />
      </>
    );
  }

  const items = itemsOf(editor.data);
  const total = countItems(items);
  const disabled = !editor.canWrite;
  const setItems = (next: MenuItemData[]) => {
    editor.setData((d) => ({ ...d, items: next }));
    if (Object.keys(editor.errors).length) editor.setErrors({});
  };
  const add = () => setItems([...items, { id: uid("item"), label: "Nuevo enlace", link: { type: "url", url: "/" } }]);

  return (
    <>
      <PageHeader title={editor.detail.title || `Menú: ${menuKey}`} description={`Clave: ${menuKey} · arrastra por el asa para reordenar y mueve a la derecha para anidar (hasta 3 niveles).`} breadcrumbs={crumbs} />
      <PublishBar kind="menu" docKey={menuKey} editor={editor} />
      {disabled ? <p className="mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted">Tienes acceso de solo lectura.</p> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
        <Card
          title={
            <span>
              Ítems <span className="text-sm font-normal text-muted">({total}/{MENU_MAX_ITEMS})</span>
            </span>
          }
          actions={
            <>
              <Button size="sm" onClick={() => setShowPreview((s) => !s)}>
                {showPreview ? "Ocultar vista previa" : "Vista previa"}
              </Button>
              {!disabled ? (
                <Button size="sm" variant="primary" leftIcon={<Plus aria-hidden size={14} />} disabled={total >= MENU_MAX_ITEMS} onClick={add}>
                  Añadir ítem
                </Button>
              ) : null}
            </>
          }
        >
          <MenuTree items={items} onChange={setItems} errors={editor.errors} disabled={disabled} />
          {Object.entries(editor.errors).filter(([k]) => !k.startsWith("items.")).map(([k, m]) => (
            <p key={k} role="alert" className="mt-2 text-xs text-danger">
              {k}: {m}
            </p>
          ))}
          {total >= MENU_MAX_ITEMS ? <p className="mt-3 text-xs text-warning">Has alcanzado el máximo de {MENU_MAX_ITEMS} ítems.</p> : null}
        </Card>
        {showPreview ? (
          <div className="w-full min-w-0 xl:w-[460px]">
            <PreviewPane kind="menu" docKey={menuKey} path="/" reloadKey={editor.savedTick} dirty={editor.dirty} />
          </div>
        ) : null}
      </div>
    </>
  );
}
