"use client";
import { PublishBar } from "@/components/admin/content/PublishBar";
import { SchemaForm } from "@/components/admin/content/SchemaForm";
import { useDraft } from "@/components/admin/content/useDraft";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { Input, Switch } from "@/components/admin/ui/Form";
import { validateField } from "@/lib/admin/api/content";
import { useDoc } from "@/lib/admin/api/content";
import { useCan } from "@/lib/admin/permissions";
import type { ContentDoc, JsonValue } from "@/lib/admin/types";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/content/MediaPicker";
import { Button } from "@/components/admin/ui/Button";

interface Settings {
  brand: { name: string; tagline?: string; logoMediaUrl?: string }; theme: { colors: Record<string, string>; fonts: { heading: string; body: string } };
  seo: { titleTemplate: string; defaultDescription: string; ogImageUrl?: string }; social: Record<string, string>;
  announcement: { enabled: boolean; text: string; href?: string }; store: { currency: string; locale: string; contactEmail?: string; whatsapp?: string };
}
const FONTS = ["Inter", "Helvetica Neue", "Archivo", "Space Grotesk", "Playfair Display", "Roboto Mono"];
const COLORS: [string, string][] = [["background", "Fondo"], ["foreground", "Texto"], ["accent", "Acento"], ["muted", "Texto secundario"], ["border", "Bordes"]];
const SOCIAL = ["instagram", "tiktok", "facebook", "youtube", "pinterest", "x"];

function Editor({ doc }: { doc: ContentDoc }) {
  const d = useDraft(doc);
  const can = useCan("content:write");
  const s = d.local as unknown as Settings;
  const [logo, setLogo] = useState(false);
  const up = (fn: (x: Settings) => Settings) => d.change(fn(structuredClone(s)) as unknown as JsonValue);
  const errs: Record<string, string> = {};
  const url = { key: "u", label: "", type: "url" as const };
  for (const k of SOCIAL) { const v = s.social[k]; if (v && !v.startsWith("https://")) errs[`social.${k}`] = "Debe empezar con https://"; }
  if (s.announcement.href && validateField(url, s.announcement.href)) errs.annHref = "URL inválida";
  for (const [k] of COLORS) { const v = s.theme.colors[k]; if (v && !/^#[0-9a-f]{6}$/i.test(v)) errs[`color.${k}`] = "Hex inválido"; }
  if (s.store.contactEmail && !/^\S+@\S+\.\S+$/.test(s.store.contactEmail)) errs.email = "Correo inválido";
  if (s.store.whatsapp && !/^\+?[0-9]{7,15}$/.test(s.store.whatsapp)) errs.wa = "WhatsApp inválido";
  if (!s.brand.name.trim()) errs.name = "Obligatorio";
  const c = s.theme.colors;
  return (
    <>
      <PublishBar doc={doc} local={d.local} dirty={d.dirty} saving={d.saving} invalidCount={Object.keys(errs).length} onSave={d.flush} onReset={d.reset} />
      <fieldset disabled={!can} className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Marca"><div className="space-y-3">
            <Input label="Nombre de la tienda" value={s.brand.name} error={errs.name} onChange={(e) => up((x) => ({ ...x, brand: { ...x.brand, name: e.target.value } }))} />
            <Input label="Eslogan" value={s.brand.tagline ?? ""} onChange={(e) => up((x) => ({ ...x, brand: { ...x.brand, tagline: e.target.value } }))} />
            <div className="flex items-center gap-3">{s.brand.logoMediaUrl ? <Image src={s.brand.logoMediaUrl} alt="Logo" width={96} height={48} unoptimized className="h-12 w-24 rounded bg-black object-contain" /> : <ImageIcon className="size-8 text-muted" />}<Button onClick={() => setLogo(true)}>Elegir logo</Button></div>
            <MediaPicker open={logo} onClose={() => setLogo(false)} onPick={([m]) => m && up((x) => ({ ...x, brand: { ...x.brand, logoMediaUrl: m.url } }))} />
          </div></Card>
          <Card title="Colores y tipografías"><div className="grid gap-3 sm:grid-cols-2">
            {COLORS.map(([k, l]) => <SchemaForm key={k} fields={[{ key: k, label: l, type: "color" }]} values={c} errors={errs[`color.${k}`] ? { [k]: errs[`color.${k}`] } : {}} onChange={(v) => up((x) => ({ ...x, theme: { ...x.theme, colors: v as Record<string, string> } }))} />)}
            {(["heading", "body"] as const).map((k) => <label key={k} className="flex flex-col gap-1.5 text-xs font-medium">{k === "heading" ? "Tipografía de títulos" : "Tipografía de texto"}<select className="h-9 rounded-sm border border-line bg-surface px-3 text-sm" value={s.theme.fonts[k]} onChange={(e) => up((x) => ({ ...x, theme: { ...x.theme, fonts: { ...x.theme.fonts, [k]: e.target.value } } }))}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>)}
          </div></Card>
          <Card title="SEO por defecto"><div className="space-y-3">
            <Input label="Plantilla del título" value={s.seo.titleTemplate} hint="Usa %s para el título de la página." onChange={(e) => up((x) => ({ ...x, seo: { ...x.seo, titleTemplate: e.target.value } }))} />
            <Input label="Descripción por defecto" value={s.seo.defaultDescription} onChange={(e) => up((x) => ({ ...x, seo: { ...x.seo, defaultDescription: e.target.value } }))} />
          </div></Card>
          <Card title="Redes sociales"><div className="grid gap-3 sm:grid-cols-2">{SOCIAL.map((k) => <Input key={k} label={k[0].toUpperCase() + k.slice(1)} placeholder="https://…" value={s.social[k] ?? ""} error={errs[`social.${k}`]} onChange={(e) => up((x) => ({ ...x, social: { ...x.social, [k]: e.target.value } }))} />)}</div></Card>
          <Card title="Barra de anuncios"><div className="space-y-3">
            <label className="flex items-center justify-between text-sm">Mostrar barra<Switch label="Mostrar barra de anuncios" checked={s.announcement.enabled} onChange={(v) => up((x) => ({ ...x, announcement: { ...x.announcement, enabled: v } }))} /></label>
            <Input label="Texto" value={s.announcement.text} maxLength={200} onChange={(e) => up((x) => ({ ...x, announcement: { ...x.announcement, text: e.target.value } }))} />
            <Input label="Enlace" value={s.announcement.href ?? ""} error={errs.annHref} onChange={(e) => up((x) => ({ ...x, announcement: { ...x.announcement, href: e.target.value } }))} />
          </div></Card>
          <Card title="Moneda y contacto"><div className="grid gap-3 sm:grid-cols-2">
            <Input label="Moneda" value={s.store.currency} disabled /><Input label="Idioma / región" value={s.store.locale} disabled />
            <Input label="Correo de contacto" type="email" value={s.store.contactEmail ?? ""} error={errs.email} onChange={(e) => up((x) => ({ ...x, store: { ...x.store, contactEmail: e.target.value } }))} />
            <Input label="WhatsApp" value={s.store.whatsapp ?? ""} error={errs.wa} onChange={(e) => up((x) => ({ ...x, store: { ...x.store, whatsapp: e.target.value } }))} />
          </div></Card>
        </div>
        <Card title="Vista previa en vivo" className="h-fit xl:sticky xl:top-32"><div className="overflow-hidden rounded-sm border border-line" style={{ background: c.background, color: c.foreground, fontFamily: s.theme.fonts.body }}>
          {s.announcement.enabled && <p className="px-2 py-1 text-center text-[11px]" style={{ background: c.accent, color: "#fff" }}>{s.announcement.text}</p>}
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: c.border }}><span className="text-sm font-bold" style={{ fontFamily: s.theme.fonts.heading }}>{s.brand.name}</span><span className="text-[11px]" style={{ color: c.muted }}>Novedades · Ropa · Nosotros</span></div>
          <div className="p-4"><p className="text-xl font-bold" style={{ fontFamily: s.theme.fonts.heading }}>{s.brand.tagline || "Tu eslogan"}</p><p className="mt-1 text-xs" style={{ color: c.muted }}>{s.seo.defaultDescription}</p><span className="mt-3 inline-block rounded px-3 py-1.5 text-xs font-semibold text-white" style={{ background: c.accent }}>Comprar ahora</span></div>
        </div></Card>
      </fieldset>
    </>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useDoc("settings", "main");
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Ajustes no encontrados" />;
  return (<><PageHeader title="Ajustes y tema" /><Editor key={data.key} doc={data} /></>);
}
