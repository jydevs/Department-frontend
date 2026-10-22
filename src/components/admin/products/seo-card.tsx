"use client";

import { Card, Input, Textarea } from "@/components/admin/ui";
import { truncate } from "@/lib/admin/format";
import { cn, storefrontLabel } from "@/lib/admin/utils";

interface Props {
  seoTitle: string;
  seoDescription: string;
  onSeoTitle: (v: string) => void;
  onSeoDescription: (v: string) => void;
  /** Título/descr. que se usarán si el SEO se deja vacío. */
  fallbackTitle: string;
  fallbackDescription: string;
  /** Ruta pública, p. ej. `/products/mi-handle`. */
  path: string;
  maxTitle: number;
  maxDescription: number;
  errors?: { seoTitle?: string; seoDescription?: string };
}

function Counter({ n, rec, max }: { n: number; rec: number; max: number }) {
  return (
    <span className={cn("text-xs tabular-nums", n > max ? "text-danger" : n > rec ? "text-warning" : "text-muted")}>
      {n}/{rec} recomendado · máx. {max}
    </span>
  );
}

export function SeoCard({ seoTitle, seoDescription, onSeoTitle, onSeoDescription, fallbackTitle, fallbackDescription, path, maxTitle, maxDescription, errors }: Props) {
  const shownTitle = seoTitle.trim() || fallbackTitle || "Título de la página";
  const shownDesc = seoDescription.trim() || fallbackDescription || "Aquí aparecerá la descripción que verán los buscadores.";
  const host = storefrontLabel();
  return (
    <Card title="Posicionamiento en buscadores (SEO)" description="Cómo se verá esta página en los resultados de Google.">
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-surface-2 p-4" aria-label="Vista previa en Google">
          <p className="truncate text-xs text-muted">
            {host}
            <span aria-hidden> › </span>
            {path.replace(/^\//, "").split("/").join(" › ")}
          </p>
          <p className="mt-0.5 truncate text-lg text-info">{truncate(shownTitle, 60)}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{truncate(shownDesc, 160)}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Input label="Título SEO" value={seoTitle} maxLength={maxTitle} error={errors?.seoTitle} placeholder={fallbackTitle} onChange={(e) => onSeoTitle(e.target.value)} />
          <Counter n={seoTitle.length} rec={60} max={maxTitle} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Textarea label="Descripción SEO" rows={3} value={seoDescription} maxLength={maxDescription} error={errors?.seoDescription} onChange={(e) => onSeoDescription(e.target.value)} />
          <Counter n={seoDescription.length} rec={160} max={maxDescription} />
        </div>
      </div>
    </Card>
  );
}
