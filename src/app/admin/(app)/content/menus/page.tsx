"use client";
import { ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PublishBar } from "@/components/admin/content/PublishBar";
import { useDraft } from "@/components/admin/content/useDraft";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Card, EmptyState, PageHeader, Skeleton, Tabs } from "@/components/admin/ui/Display";
import { Input, Select } from "@/components/admin/ui/Form";
import { SortableList } from "@/components/admin/ui/Sortable";
import { HandlePicker } from "@/components/admin/content/HandlePicker";
import { PagePreview } from "@/components/admin/content/PagePreview";
import { isSafeUrl, nodeId, useDoc, useDocs, type CmsDoc as ContentDoc, type JsonValue } from "@/lib/admin/api/content";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import type { MenuItem } from "@/lib/admin/types";

const MAX_DEPTH = 3, MAX_ITEMS = 50;
const count = (l: MenuItem[]): number => l.reduce((n, i) => n + 1 + count(i.children ?? []), 0);

function Level({ items, depth, onChange }: { items: MenuItem[]; depth: number; onChange: (n: MenuItem[]) => void }) {
  const upd = (id: string, p: Partial<MenuItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  return (
    <SortableList items={items} getId={(i) => i.id} onChange={onChange}>
      {(it, handle, idx) => {
        const type = it.link.type;
        const err = !it.label.trim() ? "Falta el texto" : type === "url" && (!it.link.url || !isSafeUrl(it.link.url)) ? "URL inválida" : type !== "url" && !it.link.handle ? "Elige un destino" : "";
        const move = (dir: -1 | 1) => { const l = [...items]; const j = idx + dir; if (j < 0 || j >= l.length) return; [l[idx], l[j]] = [l[j], l[idx]]; onChange(l); };
        return (
          <div className="mb-2">
            <div className="rounded-sm border border-line bg-surface p-2">
              <div className="grid items-center gap-2 sm:grid-cols-[auto_1fr_9rem_1.3fr_auto]">
                {handle}
                <Input aria-label="Texto del enlace" placeholder="Texto" value={it.label} onChange={(e) => upd(it.id, { label: e.target.value })} />
                <Select aria-label="Tipo de enlace" value={type} onChange={(e) => upd(it.id, { link: { type: e.target.value as MenuItem["link"]["type"] } })}><option value="collection">Colección</option><option value="product">Producto</option><option value="page">Página</option><option value="url">URL</option></Select>
                {type === "url" ? <Input aria-label="URL" placeholder="/ruta o https://" value={it.link.url ?? ""} onChange={(e) => upd(it.id, { link: { type: "url", url: e.target.value } })} />
                  : <HandlePicker bare kind={type as "product" | "collection" | "page"} label="Destino" value={it.link.handle ?? ""} onChange={(h) => upd(it.id, { link: { type, handle: h } })} />}
                <div className="flex items-center">
                  {depth < MAX_DEPTH && <IconButton label="Añadir subenlace" onClick={() => upd(it.id, { children: [...(it.children ?? []), { id: nodeId("mi"), label: "", link: { type: "url", url: "/" } }] })}><CornerDownRight className="size-4" /></IconButton>}
                  <IconButton label="Subir" disabled={idx === 0} onClick={() => move(-1)}><ChevronRight className="size-4 -rotate-90" /></IconButton>
                  <IconButton label="Bajar" disabled={idx === items.length - 1} onClick={() => move(1)}><ChevronRight className="size-4 rotate-90" /></IconButton>
                  <IconButton label="Eliminar" onClick={() => onChange(items.filter((i) => i.id !== it.id))}><Trash2 className="size-4" /></IconButton>
                </div>
              </div>
              {err && <p role="alert" className="mt-1 pl-9 text-xs text-accent-text">{err}</p>}
            </div>
            {it.children && it.children.length > 0 && <div className="ml-6 mt-2 border-l border-line pl-3"><Level items={it.children} depth={depth + 1} onChange={(children) => upd(it.id, { children })} /></div>}
          </div>
        );
      }}
    </SortableList>
  );
}
const itemsOf = (v: JsonValue): MenuItem[] => ((v as { items?: MenuItem[] } | null)?.items ?? []) as MenuItem[];
const countBad = (l: MenuItem[]): number => invalid(l) + (count(l) > MAX_ITEMS ? 1 : 0);
const invalid = (l: MenuItem[]): number => l.reduce((n, i) => n + (!i.label.trim() || (i.link.type === "url" ? !i.link.url || !isSafeUrl(i.link.url) : !i.link.handle) ? 1 : 0) + invalid(i.children ?? []), 0);

function MenuLoader({ menuKey }: { menuKey: string }) {
  const { data, isLoading, error } = useDoc("menu", menuKey);
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <EmptyState title="Menú no encontrado" text={error ? errorMessage(error) : undefined} />;
  return <MenuEditor key={`${data.key}`} doc={data} />;
}
function MenuEditor({ doc }: { doc: ContentDoc }) {
  const d = useDraft(doc, (v) => countBad(itemsOf(v)));
  const can = useCan("content:write");
  const items = itemsOf(d.local);
  const set = (n: MenuItem[]) => d.change({ items: n } as unknown as JsonValue);
  const total = count(items), bad = countBad(items);
  return (
    <>
      <PublishBar doc={doc} draft={d} invalidCount={bad} />
      <Card title={`${doc.title} (${total}/${MAX_ITEMS} ítems · hasta ${MAX_DEPTH} niveles)`} actions={can ? <Button size="sm" icon={<Plus className="size-3.5" />} disabled={total >= MAX_ITEMS} onClick={() => set([...items, { id: nodeId("mi"), label: "", link: { type: "url", url: "/" } }])}>Añadir ítem</Button> : undefined}>
        <fieldset disabled={!can}>{items.length === 0 ? <p className="text-sm text-muted">Menú vacío.</p> : <Level items={items} depth={1} onChange={set} />}</fieldset>
      </Card>
      <Card title="Vista previa de la tienda" className="mt-4"><PagePreview doc={doc} savedAt={d.savedAt} /></Card>
    </>
  );
}

export default function MenusPage() {
  const { data, isLoading, error } = useDocs();
  const menus = data?.filter((d) => d.kind === "menu") ?? [];
  const [key, setKey] = useState("main");
  const doc = menus.find((m) => m.key === key) ?? menus[0];
  if (isLoading) return <Skeleton className="h-64" />;
  if (!doc) return <EmptyState title="Sin menús" text={error ? errorMessage(error) : undefined} />;
  return (
    <>
      <PageHeader title="Menús" description="Arrastra para reordenar. Anida hasta 3 niveles." />
      <Tabs tabs={menus.map((m) => ({ key: m.key, label: m.title }))} value={doc.key} onChange={setKey} label="Menús" />
      <div className="mt-4"><MenuLoader key={doc.key} menuKey={doc.key} /></div>
    </>
  );
}
