"use client";
import clsx from "clsx";
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Spinner } from "@/components/admin/ui/Display";
import { useAllProducts } from "@/lib/admin/api/catalog";
import { usePreviewToken, type CmsDoc } from "@/lib/admin/api/content";
import { errorMessage } from "@/lib/admin/errors";

/** Origen de la tienda; vacío = mismo origen que el panel (la tienda y el panel viven en la misma app Next). */
const STORE = (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "").replace(/\/$/, "");
const DEVICES = { mobile: { w: 390, icon: Smartphone, label: "Móvil" }, tablet: { w: 820, icon: Tablet, label: "Tablet" }, desktop: { w: 1280, icon: Monitor, label: "Escritorio" } } as const;

/** Ruta de la tienda donde se ve cada documento (el token de vista previa vale para UN documento). */
function previewPath(doc: Pick<CmsDoc, "kind" | "key">, firstProduct: string | undefined): { path: string; note?: string } {
  if (doc.kind === "page") return { path: `/pages/${encodeURIComponent(doc.key)}` };
  if (doc.kind === "template") {
    switch (doc.key) {
      case "collection": return { path: "/collections/all" };
      case "product": return firstProduct ? { path: `/products/${encodeURIComponent(firstProduct)}` } : { path: "/", note: "Sin productos para previsualizar." };
      case "404": return { path: "/no-existe-vista-previa" };
      case "cart": return { path: "/", note: "El carrito es un panel lateral: ábrelo desde la cabecera." };
      case "search": return { path: "/", note: "La búsqueda es un panel lateral: ábrela desde la cabecera." };
      default: return { path: "/" };
    }
  }
  return { path: "/" };
}

/**
 * Vista previa REAL del borrador: iframe de la tienda con un token firmado por el backend
 * (`POST /admin/content/preview-tokens` → `/api/preview?token=…`). Muestra el último borrador GUARDADO
 * (el autoguardado recarga el iframe con `savedAt`).
 */
export function PagePreview({ doc, savedAt = 0 }: { doc: Pick<CmsDoc, "kind" | "key">; savedAt?: number }) {
  const [device, setDevice] = useState<keyof typeof DEVICES>("mobile");
  const [reload, setReload] = useState(0), [loaded, setLoaded] = useState(false);
  const [width, setWidth] = useState(0);
  const token = usePreviewToken(doc.kind, doc.key);
  const first = useAllProducts().data?.[0]?.handle;
  const { path, note } = previewPath(doc, first);
  const src = token.data ? `${STORE}/api/preview?token=${encodeURIComponent(token.data.token)}&path=${encodeURIComponent(path)}` : null;
  const frameKey = `${token.data?.token ?? ""}:${path}:${savedAt}:${reload}`;
  const ro = useRef<ResizeObserver | null>(null);
  const box = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.current.observe(el);
  }, []);
  const w = DEVICES[device].w, scale = width > 0 ? Math.min(1, width / w) : 1;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Dispositivo">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((k) => { const D = DEVICES[k]; return <button key={k} type="button" aria-label={D.label} aria-pressed={device === k} onClick={() => setDevice(k)} className={clsx("rounded-sm p-1.5", device === k ? "bg-accent/15 text-accent-text" : "text-muted hover:bg-surface2")}><D.icon className="size-4" /></button>; })}
        </div>
        <div className="flex gap-1">
          <Button size="sm" icon={<RefreshCw className="size-3.5" />} disabled={!src} onClick={() => { setLoaded(false); setReload((n) => n + 1); }}>Recargar</Button>
          {src && <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line px-3 text-xs font-medium hover:bg-surface2"><ExternalLink className="size-3.5" aria-hidden />Abrir en la tienda</a>}
        </div>
      </div>
      <p className="mb-2 text-xs text-muted">Borrador guardado, tal como se verá al publicar.{note ? ` ${note}` : ""}</p>
      <div ref={box} className="relative overflow-hidden rounded-sm border border-line bg-black">
        {token.isLoading && <div className="grid h-96 place-items-center"><Spinner /></div>}
        {token.error && <p role="alert" className="p-6 text-center text-sm text-accent-text">No se pudo generar la vista previa: {errorMessage(token.error)}</p>}
        {src && (
          <div style={{ height: 640 * scale }}>
            {!loaded && <div className="absolute inset-0 z-10 grid place-items-center bg-black/60"><Spinner /></div>}
            <iframe key={frameKey} src={src} title="Vista previa de la tienda" onLoad={() => setLoaded(true)} style={{ width: w, height: 640, transform: `scale(${scale})`, transformOrigin: "top left" }} className="border-0 bg-black" />
          </div>
        )}
      </div>
    </div>
  );
}
