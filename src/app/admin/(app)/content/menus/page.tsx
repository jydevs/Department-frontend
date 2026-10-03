"use client";
import { ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PublishBar } from "@/components/admin/content/PublishBar";
import { useDraft } from "@/components/admin/content/useDraft";
import { Button, IconButton } from "@/components/admin/ui/Button";
import { Card, EmptyState, PageHeader, Skeleton, Tabs } from "@/components/admin/ui/Display";
import { Input, Select } from "@/components/admin/ui/Form";
import { SortableList } from "@/components/admin/ui/Sortable";
import { useAllProducts, useCollections } from "@/lib/admin/api/catalog";
import { isSafeUrl, useDocs } from "@/lib/admin/api/content";
import { uid } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";
import type { ContentDoc, JsonValue, MenuItem } from "@/lib/admin/types";

const MAX_DEPTH = 3, MAX_ITEMS = 50;
const count = (l: MenuItem[]): number => l.reduce((n, i) => n + 1 + count(i.children ?? []), 0);

function Level({ items, depth, onChange, can }: { items: MenuItem[]; depth: number; onChange: (n: MenuItem[]) => void; can: boolean }) {
  const cols = useCollections().data ?? [], prods = useAllProducts().data ?? [], pages = useDocs().data?.filter((d) => d.kind === "page") ?? [];
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
                  : <Select aria-label="Destino" value={it.link.handle ?? ""} onChange={(e) => upd(it.id, { link: { type, handle: e.target.value } })}><option value="">Elegir…</option>{(type === "collection" ? cols.map((c) => [c.handle, c.title]) : type === "product" ? prods.map((p) => [p.handle, p.title]) : pages.map((p) => [p.key, p.title])).map(([h, t]) => <option key={h} value={h}>{t}</option>)}</Select>}
                <div className="flex items-center">
                  {depth < MAX_DEPTH && <IconButton label="Añadir subenlace" onClick={() => upd(it.id, { children: [...(it.children ?? []), { id: `m_${uid()}`, label: "", link: { type: "url", url: "/" } }] })}><CornerDownRight className="size-4" /></IconButton>}
                  <IconButton label="Subir" disabled={idx === 0} onClick={() => move(-1)}><ChevronRight className="size-4 -rotate-90" /></IconButton>
                  <IconButton label="Bajar" disabled={idx === items.length - 1} onClick={() => move(1)}><ChevronRight className="size-4 rotate-90" /></IconButton>
                  <IconButton label="Eliminar" onClick={() => onChange(items.filter((i) => i.id !== it.id))}><Trash2 className="size-4" /></IconButton>
                </div>
              </div>
              {err && <p role="alert" className="mt-1 pl-9 text-xs text-accent-text">{err}</p>}
            </div>
            {it.children && it.children.length > 0 && <div className="ml-6 mt-2 border-l border-line pl-3"><Level items={it.children} depth={depth + 1} can={can} onChange={(children) => upd(it.id, { children })} /></div>}
          </div>
        );
      }}
    </SortableList>
  );
}
const invalid = (l: MenuItem[]): number => l.reduce((n, i) => n + (!i.label.trim() || (i.link.type === "url" ? !i.link.url || !isSafeUrl(i.link.url) : !i.link.handle) ? 1 : 0) + invalid(i.children ?? []), 0);

function MenuEditor({ doc }: { doc: ContentDoc }) {
  const d = useDraft(doc);
  const can = useCan("content:write");
  const items = ((d.local as { items?: MenuItem[] }).items ?? []) as MenuItem[];
  const set = (n: MenuItem[]) => d.change({ items: n } as unknown as JsonValue);
  const total = count(items), bad = invalid(items) + (total > MAX_ITEMS ? 1 : 0);
  return (
    <>
      <PublishBar doc={doc} local={d.local} dirty={d.dirty} saving={d.saving} invalidCount={bad} onSave={d.flush} onReset={d.reset} />
      <Card title={`${doc.title} (${total}/${MAX_ITEMS} ítems · hasta ${MAX_DEPTH} niveles)`} actions={can ? <Button size="sm" icon={<Plus className="size-3.5" />} disabled={total >= MAX_ITEMS} onClick={() => set([...items, { id: `m_${uid()}`, label: "", link: { type: "url", url: "/" } }])}>Añadir ítem</Button> : undefined}>
        <fieldset disabled={!can}>{items.length === 0 ? <p className="text-sm text-muted">Menú vacío.</p> : <Level items={items} depth={1} can={can} onChange={set} />}</fieldset>
      </Card>
    </>
  );
}

export default function MenusPage() {
  const { data, isLoading } = useDocs();
  const menus = data?.filter((d) => d.kind === "menu") ?? [];
  const [key, setKey] = useState("main");
  const doc = menus.find((m) => m.key === key) ?? menus[0];
  if (isLoading) return <Skeleton className="h-64" />;
  if (!doc) return <EmptyState title="Sin menús" />;
  return (
    <>
      <PageHeader title="Menús" description="Arrastra para reordenar. Anida hasta 3 niveles." />
      <Tabs tabs={menus.map((m) => ({ key: m.key, label: m.title }))} value={doc.key} onChange={setKey} label="Menús" />
      <div className="mt-4"><MenuEditor key={doc.key} doc={doc} /></div>
    </>
  );
}
