import { slugify } from "@/lib/admin/format";

/** Vista previa aproximada del resultado en Google. */
export function SeoPreview({ title, description, handle, base = "daregulardept.com/products" }: { title: string; description: string; handle: string; base?: string }) {
  return (
    <div className="rounded-sm border border-line bg-surface2 p-3">
      <p className="truncate text-xs text-muted">{base}/{handle || slugify(title) || "…"}</p>
      <p className="truncate text-base text-info">{title.slice(0, 60) || "Título de la página"}</p>
      <p className="line-clamp-2 text-xs text-muted">{description.slice(0, 160) || "Descripción de la página para buscadores."}</p>
      <p className="mt-1 text-[11px] text-muted">{title.length}/60 · {description.length}/160</p>
    </div>
  );
}
