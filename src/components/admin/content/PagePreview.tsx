"use client";
import clsx from "clsx";
import { ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Markdown } from "@/components/admin/ui/Markdown";
import { usePreviewToken } from "@/lib/admin/api/content";
import { safeHref } from "@/lib/admin/format";
import type { JsonValue, Section } from "@/lib/admin/types";

const STORE = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";
const DEVICES = { mobile: { w: 375, icon: Smartphone, label: "Móvil" }, tablet: { w: 768, icon: Tablet, label: "Tablet" }, desktop: { w: 1100, icon: Monitor, label: "Escritorio" } } as const;
const s = (v: JsonValue | undefined): string => (typeof v === "string" ? v : "");

/**
 * Vista previa simulada (wireframe en vivo del borrador). Cuando exista la API, el
 * botón “Abrir en la tienda” usará el token real de `POST /admin/content/preview-tokens`
 * y `STOREFRONT_URL/api/preview?token=…` dentro de un iframe.
 */
export function PagePreview({ sections }: { sections: Section[] }) {
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const token = usePreviewToken();
  const open = () => token.mutate(undefined, { onSuccess: (r) => { const href = safeHref(`${STORE}/api/preview?token=${r.token}`); if (href) window.open(href, "_blank", "noopener,noreferrer"); } });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Dispositivo">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((k) => { const D = DEVICES[k]; return <button key={k} type="button" aria-label={D.label} aria-pressed={device === k} onClick={() => setDevice(k)} className={clsx("rounded-sm p-1.5", device === k ? "bg-accent/15 text-accent-text" : "text-muted hover:bg-surface2")}><D.icon className="size-4" /></button>; })}
        </div>
        <Button size="sm" icon={<ExternalLink className="size-3.5" />} loading={token.isPending} onClick={open}>Abrir en la tienda</Button>
      </div>
      <div className="overflow-auto rounded-sm border border-line bg-black p-2">
        <div className="mx-auto overflow-hidden rounded bg-black text-white" style={{ width: Math.min(DEVICES[device].w, 1100), maxWidth: "100%" }}>
          {sections.filter((x) => x.enabled).map((x) => <Block key={x.id} sec={x} />)}
          {sections.every((x) => !x.enabled) && <p className="p-10 text-center text-sm text-white/50">Sin secciones activas</p>}
        </div>
      </div>
    </div>
  );
}

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return src ? <Image src={src} alt={alt} width={800} height={500} unoptimized className={className} /> : <div className={clsx("grid place-items-center bg-white/10 text-xs text-white/40", className)}>Sin imagen</div>;
}
function Block({ sec }: { sec: Section }) {
  const st = sec.settings, bg = s(st.backgroundColor) || undefined, fg = s(st.textColor) || undefined;
  const align = s(st.alignment) === "center" ? "text-center items-center" : s(st.alignment) === "right" ? "text-right items-end" : "text-left items-start";
  switch (sec.type) {
    case "announcement-bar": return <div className="px-3 py-1.5 text-center text-xs" style={{ background: bg ?? "#d10000", color: fg ?? "#fff" }}>{s(st.text)}</div>;
    case "hero": return (
      <div className="relative"><Img src={s(st.imageUrl)} alt={s(st.imageAlt)} className="h-64 w-full object-cover" />
        <div className="absolute inset-0 bg-black" style={{ opacity: typeof st.overlayOpacity === "number" ? st.overlayOpacity : 0.2 }} />
        <div className={clsx("absolute inset-0 flex flex-col justify-end gap-1 p-5", align)}><p className="text-[10px] uppercase tracking-widest">{s(st.eyebrow)}</p><p className="text-2xl font-bold leading-tight">{s(st.heading)}</p><p className="text-xs text-white/80">{s(st.subheading)}</p>{s(st.ctaLabel) && <span className="mt-1 rounded bg-white px-3 py-1 text-xs font-semibold text-black">{s(st.ctaLabel)}</span>}</div></div>);
    case "marquee": return <div className="overflow-hidden whitespace-nowrap py-2 text-xs font-semibold tracking-widest" style={{ background: bg ?? "#000", color: fg ?? "#fff" }}>{(sec.blocks ?? []).map((b) => s(b.settings.text)).join("  ·  ")}</div>;
    case "new-arrivals": return <div className="p-5"><p className="text-lg font-bold">{s(st.heading)}</p><p className="mb-3 text-xs text-white/60">{s(st.subheading)}</p><div className={clsx("grid gap-2", s(st.columns) === "2" ? "grid-cols-2" : s(st.columns) === "3" ? "grid-cols-3" : "grid-cols-4")}>{Array.from({ length: Math.min(4, Number(st.limit) || 4) }, (_, i) => <div key={i} className="aspect-[4/5] rounded bg-white/10" />)}</div><p className="mt-2 text-xs text-white/50">Colección: {s(st.collectionHandle) || "—"}</p></div>;
    case "split-banner": return <div className={clsx("flex", s(st.imagePosition) === "right" && "flex-row-reverse")} style={{ background: bg }}><Img src={s(st.imageUrl)} alt={s(st.imageAlt)} className="h-44 w-1/2 object-cover" /><div className="flex w-1/2 flex-col justify-center gap-1 p-4"><p className="font-bold">{s(st.heading)}</p><p className="text-xs text-white/70">{s(st.text)}</p></div></div>;
    case "value-props": return <div className="p-5"><p className="mb-3 font-bold">{s(st.heading)}</p><div className="grid grid-cols-3 gap-3">{(sec.blocks ?? []).map((b) => <div key={b.id} className="rounded bg-white/5 p-3"><p className="text-xs font-semibold">{s(b.settings.title)}</p><p className="text-[11px] text-white/60">{s(b.settings.text)}</p></div>)}</div></div>;
    case "campaign": return <div className="relative"><Img src={s(st.imageUrl)} alt={s(st.imageAlt)} className="h-48 w-full object-cover" /><div className={clsx("absolute inset-0 flex flex-col justify-center gap-1 bg-black/40 p-5", align)}><p className="text-[10px] uppercase tracking-widest">{s(st.eyebrow)}</p><p className="text-xl font-bold">{s(st.heading)}</p><p className="text-xs">{s(st.text)}</p></div></div>;
    case "editorial": return <div className="grid gap-3 p-5 sm:grid-cols-2">{s(st.layout) !== "text-only" && s(st.imageUrl) && <Img src={s(st.imageUrl)} alt={s(st.imageAlt)} className={clsx("h-40 w-full rounded object-cover", s(st.layout) === "image-right" && "sm:order-2")} />}<div><p className="mb-2 text-lg font-bold">{s(st.heading)}</p><Markdown source={s(st.body)} className="space-y-2 text-xs text-white/80" /></div></div>;
    case "lookbook": return <div className="p-5"><p className="mb-3 font-bold">{s(st.heading)}</p><div className="grid grid-cols-3 gap-2">{(sec.blocks ?? []).map((b) => <Img key={b.id} src={s(b.settings.imageUrl)} alt={s(b.settings.alt)} className="aspect-square w-full rounded object-cover" />)}</div></div>;
    case "newsletter": return <div className="p-6 text-center" style={{ background: bg ?? "#111" }}><p className="font-bold">{s(st.heading)}</p><p className="mb-2 text-xs text-white/60">{s(st.text)}</p><div className="mx-auto flex max-w-xs gap-1"><span className="flex-1 rounded bg-white/10 px-2 py-1.5 text-left text-xs text-white/60">{s(st.placeholder)}</span><span className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-black">{s(st.buttonLabel)}</span></div></div>;
    case "rich-text": return <div className={clsx("p-5", s(st.alignment) === "center" && "text-center")}><p className="mb-2 text-lg font-bold">{s(st.heading)}</p><Markdown source={s(st.body)} className="space-y-2 text-xs text-white/80" /></div>;
    case "footer": return <div className="grid grid-cols-3 gap-3 p-5 text-xs" style={{ background: bg ?? "#0a0a0a" }}>{(sec.blocks ?? []).map((b) => <div key={b.id}><p className="mb-1 font-semibold">{s(b.settings.title)}</p>{(Array.isArray(b.settings.links) ? (b.settings.links as { label: string }[]) : []).map((l, i) => <p key={i} className="text-white/60">{l.label}</p>)}</div>)}<p className="col-span-3 text-white/40">{s(st.copyright)}</p></div>;
    default: return <div className="p-3 text-xs text-white/50">Sección desconocida: {sec.type}</div>;
  }
}
