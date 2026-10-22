"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, ImageOff, UploadCloud, X } from "lucide-react";
import { Button, IconButton, Spinner } from "@/components/admin/ui";
import { resolveMediaSrc, ALLOWED_ACCEPT } from "@/lib/admin/api/media";
import { cn } from "@/lib/admin/utils";
import type { UploadEntry } from "./use-uploader";

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(n / 1024 / 1024).toFixed(2).replace(".", ",")} MB`;
}

/** Imagen con carga diferida; si la URL no es segura o falla, muestra un icono. */
export function MediaThumb({ url, alt, className }: { url: string | null | undefined; alt?: string | null; className?: string }) {
  const src = resolveMediaSrc(url);
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 text-muted", className)} role="img" aria-label={alt || "Imagen no disponible"}>
        <ImageOff aria-hidden size={20} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" onError={() => setFailed(src)} className={cn("bg-surface-2 object-cover", className)} />
  );
}

/** Zona para soltar archivos o elegirlos con el selector del sistema. */
export function Dropzone({ onFiles, disabled, compact }: { onFiles: (files: FileList | File[]) => void; disabled?: boolean; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      data-testid="dropzone"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors",
        compact ? "px-4 py-4" : "px-6 py-8",
        over ? "border-accent bg-accent/10" : "border-border-strong bg-surface-2/40",
        disabled && "opacity-60",
      )}
    >
      <UploadCloud aria-hidden size={compact ? 20 : 26} className="text-muted" />
      <p className="text-sm">
        Arrastra imágenes aquí o{" "}
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => input.current?.click()} className="ml-1">
          Elegir archivos
        </Button>
      </p>
      <p className="text-xs text-muted">PNG, JPEG, WebP, AVIF o GIF · máximo 8 MB por archivo · puedes subir varios a la vez</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={ALLOWED_ACCEPT}
        className="sr-only"
        aria-label="Seleccionar archivos de imagen"
        data-testid="file-input"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Lista de subidas con barra de progreso por archivo. */
export function UploadList({ entries, onClear }: { entries: UploadEntry[]; onClear: () => void }) {
  if (!entries.length) return null;
  const finished = entries.some((e) => e.status !== "uploading");
  return (
    <div className="rounded-lg border border-border bg-surface" aria-live="polite">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[13px] font-medium">Subidas ({entries.filter((e) => e.status === "done").length}/{entries.length})</p>
        {finished ? (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Limpiar
          </Button>
        ) : null}
      </div>
      <ul className="max-h-48 divide-y divide-border overflow-y-auto">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex size-5 shrink-0 items-center justify-center">
              {e.status === "uploading" ? <Spinner size={14} /> : e.status === "done" ? <CheckCircle2 aria-hidden size={16} className="text-success" /> : <AlertCircle aria-hidden size={16} className="text-danger" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">{e.name}</p>
              {e.status === "uploading" ? (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={e.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Subiendo ${e.name}`}>
                  <div className="h-full bg-accent transition-[width]" style={{ width: `${e.progress}%` }} />
                </div>
              ) : e.status === "error" ? (
                <p className="text-xs text-danger">{e.error}</p>
              ) : (
                <p className="text-xs text-muted">{e.reused ? "Ya existía en la biblioteca (mismo archivo)" : "Subido"} · {formatBytes(e.size)}</p>
              )}
            </div>
            {e.status === "uploading" ? <span className="text-xs text-muted tabular-nums">{e.progress}%</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RemoveBadgeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <IconButton label={label} size="sm" variant="secondary" icon={<X aria-hidden size={14} />} onClick={onClick} />;
}
