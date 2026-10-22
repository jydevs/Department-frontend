"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Laptop, RefreshCw, Smartphone, Tablet, TriangleAlert } from "lucide-react";
import { Button, IconButton, Spinner } from "@/components/admin/ui";
import { errorMessage } from "@/lib/admin/errors";
import { createPreviewToken, type ContentKind } from "@/lib/admin/api/content";
import { STOREFRONT_URL, cn, safeHref, storefrontLabel } from "@/lib/admin/utils";

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: Array<{ key: Device; label: string; width: number; icon: typeof Smartphone }> = [
  { key: "mobile", label: "Móvil (390 px)", width: 390, icon: Smartphone },
  { key: "tablet", label: "Tablet (768 px)", width: 768, icon: Tablet },
  { key: "desktop", label: "Escritorio (1280 px)", width: 1280, icon: Laptop },
];

interface Props {
  kind: ContentKind;
  docKey: string;
  /** Ruta de la tienda a mostrar (ya calculada según la plantilla). */
  path: string;
  /** Se incrementa tras guardar el borrador para recargar el iframe. */
  reloadKey: number;
  dirty: boolean;
  className?: string;
}

/** Vista previa del borrador: iframe de la tienda con un token de preview, con selector de dispositivo. */
export function PreviewPane({ kind, docKey, path, reloadKey, dirty, className }: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const [manualReload, setManualReload] = useState(0);
  const [pathInput, setPathInput] = useState(path);
  const [pathProp, setPathProp] = useState(path);
  const [activePath, setActivePath] = useState(path);
  // si la plantilla cambia la ruta por defecto, la adoptamos
  if (path !== pathProp) {
    setPathProp(path);
    setPathInput(path);
    setActivePath(path);
  }

  const token = useQuery({
    queryKey: ["content", "preview-token", kind, docKey],
    queryFn: () => createPreviewToken(kind, docKey),
    staleTime: 30 * 60_000,
    retry: false,
  });
  const probe = useQuery({
    queryKey: ["content", "storefront-probe"],
    queryFn: async ({ signal }) => {
      await fetch(`${STOREFRONT_URL}/`, { mode: "no-cors", signal, cache: "no-store" });
      return true;
    },
    staleTime: 10_000,
    retry: false,
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(600);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWrapW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dev = DEVICES.find((d) => d.key === device) ?? DEVICES[2];
  const scale = Math.min(1, (wrapW - 2) / dev.width);
  const FRAME_H = 620;
  const src = token.data ? safeHref(`${STOREFRONT_URL}/api/preview?token=${encodeURIComponent(token.data.token)}&path=${encodeURIComponent(activePath)}`) : null;
  const unavailable = probe.isError;

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)} data-testid="preview-pane">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Dispositivo de la vista previa" className="inline-flex overflow-hidden rounded-md border border-border-strong">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={device === d.key}
              title={d.label}
              aria-label={d.label}
              onClick={() => setDevice(d.key)}
              className={cn("flex h-8 w-9 items-center justify-center", device === d.key ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted hover:text-text")}
            >
              <d.icon aria-hidden size={15} />
            </button>
          ))}
        </div>
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const p = pathInput.trim();
            setActivePath(p.startsWith("/") && !p.startsWith("//") ? p : `/${p.replace(/^\/+/, "")}`);
          }}
        >
          <input
            aria-label="Ruta de la tienda a previsualizar"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-border-strong bg-surface-2 px-2 font-mono text-xs focus:border-focus focus:outline-none"
          />
        </form>
        <IconButton label="Recargar vista previa" size="sm" icon={<RefreshCw aria-hidden size={14} />} onClick={() => setManualReload((n) => n + 1)} />
        {src ? (
          <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Abrir vista previa en una pestaña nueva" title="Abrir en una pestaña nueva" className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text">
            <ExternalLink aria-hidden size={14} />
          </a>
        ) : null}
      </div>
      {dirty ? <p className="text-xs text-warning">La vista previa muestra el último borrador guardado. Guarda para ver tus cambios recientes.</p> : null}

      <div ref={wrapRef} className="overflow-hidden rounded-lg border border-border bg-surface-2" style={{ height: FRAME_H * 1 }}>
        {token.isPending || probe.isPending ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
            <Spinner size={16} /> Preparando la vista previa…
          </div>
        ) : token.isError ? (
          <Unavailable title="No se pudo crear la vista previa" detail={errorMessage(token.error)} onRetry={() => void token.refetch()} />
        ) : unavailable ? (
          <Unavailable
            title="La tienda no está disponible"
            detail={`No se pudo cargar la tienda en esta misma web (${storefrontLabel()}). Comprueba que la tienda esté en marcha.`}
            onRetry={() => void probe.refetch()}
          />
        ) : src ? (
          <div style={{ width: dev.width * scale, height: FRAME_H, margin: "0 auto" }}>
            <iframe
              key={`${reloadKey}-${manualReload}-${activePath}`}
              title={`Vista previa (${dev.label})`}
              src={src}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              style={{ width: dev.width, height: FRAME_H / scale, transform: `scale(${scale})`, transformOrigin: "top left", border: 0, background: "#fff" }}
            />
          </div>
        ) : (
          <Unavailable title="Enlace de vista previa no válido" detail="La URL de la tienda no es segura." />
        )}
      </div>
      <p className="text-xs text-muted">Si ves la página en blanco, la tienda aún no soporta la vista previa de este contenido o bloquea su inserción en un marco. Usa «Abrir en una pestaña nueva».</p>
    </div>
  );
}

function Unavailable({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" role="status">
      <TriangleAlert aria-hidden size={24} className="text-warning" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted">{detail}</p>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
