"use client";

import { useEffect } from "react";
import { MediaThumb } from "@/components/admin/media/media-parts";
import { HEX_RE, isObj, type Obj } from "./content-utils";

const FONT_RE = /^[A-Za-z0-9 ]{1,40}$/;

/** Carga una tipografía de Google Fonts solo para la vista previa (nombre saneado). */
function useGoogleFonts(names: string[]) {
  const key = names.filter((n) => FONT_RE.test(n)).join("|");
  useEffect(() => {
    for (const name of key.split("|").filter(Boolean)) {
      const id = `gf-${name.replace(/ /g, "-")}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [key]);
}

function col(colors: Obj, key: string, fallback: string): string {
  const v = colors[key];
  return typeof v === "string" && HEX_RE.test(v) ? v : fallback;
}

function readable(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
}

function font(name: unknown, fallback: string): string {
  return typeof name === "string" && FONT_RE.test(name) ? `"${name}", ${fallback}` : fallback;
}

/** Muestra en vivo de cómo se verá la tienda con los colores y tipografías elegidos. */
export function ThemePreview({ data }: { data: Obj }) {
  const theme = isObj(data.theme) ? data.theme : {};
  const colors = isObj(theme.colors) ? theme.colors : {};
  const fonts = isObj(theme.fonts) ? theme.fonts : {};
  const brand = isObj(data.brand) ? data.brand : {};
  const ann = isObj(data.announcement) ? data.announcement : {};

  const bg = col(colors, "background", "#000000");
  const fg = col(colors, "foreground", "#ffffff");
  const accent = col(colors, "accent", "#d10000");
  const accentDark = col(colors, "accentDark", accent);
  const accentLight = col(colors, "accentLight", accent);
  const muted = col(colors, "muted", "#8a8a8a");
  const border = col(colors, "border", "#2a2a2a");
  const info = col(colors, "info", "#4f7bd6");
  const annBg = col(ann, "backgroundColor", accent);
  const annFg = col(ann, "textColor", readable(annBg));
  const heading = font(fonts.heading, "system-ui, sans-serif");
  const body = font(fonts.body, "system-ui, sans-serif");
  const condensed = font(fonts.condensed ?? fonts.heading, "system-ui, sans-serif");
  const script = font(fonts.script, "cursive");
  useGoogleFonts([fonts.heading, fonts.body, fonts.condensed, fonts.script].filter((x): x is string => typeof x === "string"));

  const name = typeof brand.name === "string" && brand.name ? brand.name : "Tu marca";
  const tagline = typeof brand.tagline === "string" ? brand.tagline : "";
  const logo = typeof brand.logoMediaUrl === "string" ? brand.logoMediaUrl : "";
  const annText = Array.isArray(ann.items) && typeof ann.items[0] === "string" ? (ann.items[0] as string) : typeof ann.text === "string" ? ann.text : "";

  const swatches: Array<[string, string]> = [
    ["Fondo", bg],
    ["Texto", fg],
    ["Acento", accent],
    ["Acento oscuro", accentDark],
    ["Acento claro", accentLight],
    ["Atenuado", muted],
    ["Bordes", border],
    ["Secundario", info],
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong" style={{ background: bg, color: fg, fontFamily: body }} data-testid="theme-preview" aria-label="Vista previa del tema">
      {ann.enabled === true ? (
        <div className="px-3 py-1.5 text-center text-[11px] uppercase tracking-wider" style={{ background: annBg, color: annFg, fontFamily: condensed }}>
          {annText || "Barra de anuncios"}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex min-w-0 items-center gap-2">
          {logo ? <MediaThumb url={logo} alt="" className="size-7 rounded object-contain" /> : null}
          <span className="truncate text-lg uppercase" style={{ fontFamily: heading }}>
            {name}
          </span>
        </div>
        <nav className="flex gap-3 text-[11px] uppercase tracking-wider" style={{ fontFamily: condensed }} aria-hidden>
          <span>Inicio</span>
          <span style={{ color: accentLight }}>Clothes</span>
          <span style={{ color: muted }}>Community</span>
        </nav>
      </div>
      <div className="px-4 py-8">
        <p className="text-[11px] uppercase tracking-widest" style={{ color: muted, fontFamily: condensed }}>
          Nueva colección
        </p>
        <h3 className="mt-1 text-4xl leading-none uppercase" style={{ fontFamily: heading, color: fg }}>
          Uniforms for
          <br />
          the unnoticed<span style={{ color: accent }}>.</span>
        </h3>
        <p className="mt-1 text-2xl" style={{ fontFamily: script, color: accentLight }}>
          Regular members only
        </p>
        <p className="mt-3 max-w-sm text-sm" style={{ color: muted }}>
          {tagline || "Este es un párrafo de ejemplo con la tipografía del cuerpo. Así se leerán las descripciones y textos largos."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex h-9 items-center px-5 text-xs uppercase tracking-wider" style={{ background: accent, color: readable(accent), fontFamily: condensed }}>
            Comprar
          </span>
          <span className="inline-flex h-9 items-center px-5 text-xs uppercase tracking-wider" style={{ border: `1px solid ${fg}`, color: fg, fontFamily: condensed }}>
            Ver más
          </span>
          <span className="inline-flex h-9 items-center px-5 text-xs uppercase tracking-wider" style={{ background: info, color: readable(info), fontFamily: condensed }}>
            Iniciar sesión
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {[0, 1].map((i) => (
          <div key={i} className="p-3" style={{ border: `1px solid ${border}` }}>
            <div className="mb-2 h-16" style={{ background: i ? accentDark : border }} />
            <p className="text-xs uppercase" style={{ fontFamily: condensed }}>
              Camiseta básica
            </p>
            <p className="text-sm" style={{ color: accentLight }}>
              $99.000
            </p>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-1.5 px-4 pb-4" aria-label="Paleta">
        {swatches.map(([label, hex]) => (
          <li key={label} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]" style={{ border: `1px solid ${border}`, color: muted }}>
            <span className="inline-block size-3 rounded-full" style={{ background: hex, border: `1px solid ${border}` }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
