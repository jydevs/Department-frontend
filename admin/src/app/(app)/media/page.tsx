"use client";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/Display";
import { Input, SearchInput } from "@/components/ui/Form";
import { Dialog, useConfirm } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/errors";
import { uploadFile, useDeleteMedia, useMedia, useMediaUsages, useUpdateMedia } from "@/lib/api/media";
import { useCan } from "@/lib/permissions";
import type { MediaItem } from "@/lib/types";

const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

export default function MediaPage() {
  const [q, setQ] = useState("");
  const onSearch = useCallback((v: string) => setQ(v), []);
  const { data, isLoading } = useMedia(q);
  const can = useCan("media:write");
  const toast = useToast(), qc = useQueryClient(), confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<MediaItem | null>(null);
  const [alt, setAlt] = useState("");
  const upd = useUpdateMedia(), del = useDeleteMedia();
  const usages = useMediaUsages(sel?.id ?? null).data;
  const upload = async (files: FileList | File[]) => {
    await Promise.all(Array.from(files).map(async (f) => {
      const k = f.name + f.size;
      try { await uploadFile(f, (p) => setProgress((x) => ({ ...x, [k]: p }))); toast.success(`${f.name} subido`); } catch (e) { toast.error(errorMessage(e)); }
      setProgress((x) => { const { [k]: _omit, ...rest } = x; void _omit; return rest; });
    }));
    await qc.invalidateQueries({ queryKey: ["media"] });
  };
  const drop = (e: DragEvent) => { e.preventDefault(); if (can) void upload(e.dataTransfer.files); };
  const remove = async (m: MediaItem) => {
    const used = m.usages.length ? ` Está en uso en: ${m.usages.map((u) => u.label).join(", ")}; esas referencias quedarán rotas.` : "";
    if (await confirm({ title: "Eliminar archivo", message: `Se eliminará ${m.name}.${used}`, danger: true, confirmLabel: "Eliminar" })) del.mutate(m.id, { onSuccess: () => setSel(null) });
  };
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={drop}>
      <PageHeader title="Biblioteca de medios" description="Imágenes JPG, PNG, WebP, GIF o AVIF de hasta 8 MB. Puedes arrastrar archivos aquí."
        actions={can ? <><input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} /><Button variant="primary" icon={<Upload className="size-4" />} onClick={() => input.current?.click()}>Subir archivos</Button></> : undefined} />
      <SearchInput onSearch={onSearch} placeholder="Buscar por nombre o alt" className="mb-3 max-w-sm" />
      {Object.entries(progress).length > 0 && <ul className="mb-3 space-y-1.5" aria-label="Subidas en curso">{Object.entries(progress).map(([k, p]) => <li key={k} className="text-xs"><div className="mb-0.5 flex justify-between"><span>{k.replace(/\d+$/, "")}</span><span>{p}%</span></div><div className="h-1.5 rounded bg-surface2" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><div className="h-1.5 rounded bg-accent transition-all" style={{ width: `${p}%` }} /></div></li>)}</ul>}
      {isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] h-auto" />)}</div>
        : !data?.length ? <EmptyState icon={<ImageIcon className="size-8" />} title="Sin archivos" text="Sube imágenes para usarlas en productos y contenido." />
        : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{data.map((m) => (
          <li key={m.id}><button type="button" onClick={() => { setSel(m); setAlt(m.alt); }} className="group block w-full overflow-hidden rounded-xl border border-line bg-surface text-left hover:border-accent">
            <Image src={m.url} alt={m.alt || m.name} width={240} height={180} unoptimized className="aspect-[4/3] w-full object-cover" />
            <div className="p-2"><p className="truncate text-xs font-medium">{m.name}</p><p className="flex items-center justify-between text-[11px] text-muted">{kb(m.size)}{m.usages.length > 0 && <Badge tone="info">{m.usages.length} uso(s)</Badge>}</p></div>
          </button></li>))}</ul>}
      <Dialog open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ""} size="lg"
        footer={sel && can ? <><Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => void remove(sel)}>Eliminar</Button><Button variant="primary" loading={upd.isPending} disabled={alt === sel.alt} onClick={() => upd.mutate({ id: sel.id, alt }, { onSuccess: () => setSel({ ...sel, alt }) })}>Guardar</Button></> : undefined}>
        {sel && <div className="grid gap-4 sm:grid-cols-2">
          <Image src={sel.url} alt={sel.alt || sel.name} width={400} height={300} unoptimized className="w-full rounded-lg" />
          <div className="space-y-3 text-sm"><Input label="Texto alternativo" value={alt} disabled={!can} onChange={(e) => setAlt(e.target.value)} hint="Describe la imagen para lectores de pantalla y SEO." /><p className="text-muted">{sel.type} · {kb(sel.size)}</p>
            <div><p className="mb-1 text-xs font-medium">Usos</p>{usages?.length ? <ul className="space-y-1">{usages.map((u, i) => <li key={i}><Badge tone="info">{u.label}</Badge></li>)}</ul> : <p className="text-xs text-muted">No se usa en ningún documento.</p>}</div></div>
        </div>}
      </Dialog>
    </div>
  );
}
