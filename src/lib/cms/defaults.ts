import type { SiteSettings } from "@/lib/api/types";

/**
 * Built-in site settings. Used (a) to fill any key the CMS document leaves out and (b) as the
 * whole configuration when the API cannot be reached, so the chrome (header / footer) and the
 * error page still render with the brand.
 */
export const FALLBACK_SETTINGS: SiteSettings = {
  brand: {
    name: "Daregular Dept.",
    tagline: "Uniforms for the unnoticed.",
    description:
      "Este proyecto es el primer lanzamiento oficial de Disruptive Dept, una marca que no diseña ropa, sino mensajes.",
  },
  theme: {
    colors: {
      background: "#000000",
      foreground: "#ffffff",
      accent: "#e10e0e",
      muted: "#8a8a8a",
      border: "#1a1a1a",
      accentDark: "#7c0d0d",
      accentLight: "#ff5a52",
      info: "#4f7bd6",
      gray100: "#f2f2f2",
      gray300: "#cfcfcf",
      gray500: "#8a8a8a",
      gray900: "#141414",
    },
    fonts: { heading: "Anton", body: "Inter", condensed: "Oswald", script: "Pinyon Script" },
    colorScheme: "dark",
  },
  seo: {
    titleTemplate: "%s — Daregular Dept.",
    defaultTitle: "Daregular Dept. — Uniforms for the unnoticed",
    defaultDescription:
      "Uniforms for the unnoticed. Rags to Riches — Extended Version: ropa que no diseña ropa, sino mensajes.",
  },
  social: {},
  announcement: { enabled: false, text: "" },
  store: { currency: "COP", locale: "es-CO" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function group<T extends object>(base: T, override: unknown): T {
  return isRecord(override) ? ({ ...base, ...override } as T) : base;
}

/** Overlays a (possibly partial / malformed) CMS settings document on the defaults. */
export function mergeSettings(data: Partial<SiteSettings>): SiteSettings {
  const theme: Partial<SiteSettings["theme"]> = isRecord(data.theme) ? data.theme : {};
  return {
    brand: group(FALLBACK_SETTINGS.brand, data.brand),
    theme: {
      colors: group(FALLBACK_SETTINGS.theme.colors, theme.colors),
      fonts: group(FALLBACK_SETTINGS.theme.fonts, theme.fonts),
      colorScheme: theme.colorScheme === "light" || theme.colorScheme === "dark" ? theme.colorScheme : "dark",
    },
    seo: group(FALLBACK_SETTINGS.seo, data.seo),
    social: group(FALLBACK_SETTINGS.social, data.social),
    announcement: group(FALLBACK_SETTINGS.announcement, data.announcement),
    store: group(FALLBACK_SETTINGS.store, data.store),
  };
}
