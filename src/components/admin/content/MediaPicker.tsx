"use client";
import { Check, ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { SearchInput } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { Spinner } from "@/components/admin/ui/Display";
import { useToast } from "@/components/admin/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { uploadFile, useMedia } from "@/lib/admin/api/media";
import { errorMessage } from "@/lib/admin/errors";
import type { MediaItem } from "@/lib/admin/types";

/** Selector modal reutilizable de la biblioteca de medios. */
export function MediaPicker({ open, onClose, onPick, multiple }: { open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; multiple?: boolean }) {
  const [q, setQ] = useState("");
  const onSearch = useCallback((v: string) => setQ(v), []);
  const { data, isLoading } = useMedia(q);
  const [sel, setSel] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast(), qc = useQueryClient();
  const [up, setUp] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<MediaItem[]>([]); // subidas en esta sesión (aún pueden no estar en la lista refrescada)
  const toggle = (id: string) => setSel((s) => (multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try { setUp(0); const m = await uploadFile(f, setUp); setUploaded((u) => [m, ...u]); toggle(m.id); } catch (e) { toast.error(errorMessage(e)); }
    }
    setUp(null); if (input.current) input.current.value = ""; await qc.invalidateQueries({ queryKey: ["media"] });
  };
  const close = () => { setSel([]); setUploaded([]); onClose(); };
  const done = () => {
    const pool = [...uploaded, ...(data ?? [])];
    onPick(sel.map((id) => pool.find((m) => m.id === id)).filter((m): m is MediaItem => !!m));
    close();
  };
  return (
    <Dialog open={open} onClose={close} title="Biblioteca de medios" size="xl"
      footer={<><Button onClick={close}>Cancelar</Button><Button variant="primary" disabled={!sel.length} onClick={done}>Usar {sel.length > 1 ? `${sel.length} imágenes` : "imagen"}</Button></>}>
      <div className="mb-3 flex gap-2">
        <SearchInput onSearch={onSearch} placeholder="Buscar por nombre o alt" className="flex-1" />
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
        <Button icon={<Upload className="size-4" />} loading={up !== null} onClick={() => input.current?.click()}>{up !== null ? `${up}%` : "Subir"}</Button>
      </div>
      {isLoading ? <div className="grid place-items-center py-12"><Spinner /></div> : !data?.length ? <p className="py-12 text-center text-sm text-muted"><ImageIcon className="mx-auto mb-2 size-8" />Sin archivos.</p> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {data.map((m) => (
            <li key={m.id}>
              <button type="button" aria-pressed={sel.includes(m.id)} onClick={() => toggle(m.id)} className={`group relative block w-full overflow-hidden rounded-sm border-2 ${sel.includes(m.id) ? "border-accent" : "border-transparent"}`}>
                <Image src={m.url} alt={m.alt || m.name} width={200} height={150} unoptimized className="aspect-[4/3] w-full object-cover" />
                {sel.includes(m.id) && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-white"><Check className="size-3" /></span>}
                <span className="block truncate bg-surface2 px-2 py-1 text-left text-xs">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
