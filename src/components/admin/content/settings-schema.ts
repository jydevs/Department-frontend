import type { JsonSchema } from "@/lib/admin/api/content";

/**
 * Esquemas de cada grupo de `settings/site` (espejo de src/cms/schemas/settings.schema.ts del backend).
 * El endpoint section-types solo describe secciones, así que los ajustes se declaran aquí
 * para reutilizar el mismo SchemaForm.
 */
const HEX = "^#[0-9a-fA-F]{6}$";

const str = (maxLength: number, extra: Partial<JsonSchema> = {}): JsonSchema => ({ type: "string", maxLength, ...extra });
const hex = (): JsonSchema => ({ type: "string", pattern: HEX });

export const BRAND_SCHEMA: JsonSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: str(80, { minLength: 1 }),
    tagline: str(200),
    description: str(500),
    logoMediaUrl: { type: "string" },
  },
};

export const COLORS_SCHEMA: JsonSchema = {
  type: "object",
  required: ["background", "foreground", "accent"],
  properties: {
    background: hex(),
    foreground: hex(),
    accent: hex(),
    accentDark: hex(),
    accentLight: hex(),
    muted: hex(),
    border: hex(),
    info: hex(),
    gray100: hex(),
    gray300: hex(),
    gray500: hex(),
    gray900: hex(),
  },
};

export const SEO_SCHEMA: JsonSchema = {
  type: "object",
  required: ["titleTemplate", "defaultDescription"],
  properties: {
    titleTemplate: str(120, { minLength: 1 }),
    defaultTitle: str(160),
    defaultDescription: str(320),
    ogImageUrl: { type: "string" },
  },
};

export const SOCIAL_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    instagram: str(500),
    tiktok: str(500),
    facebook: str(500),
    youtube: str(500),
    pinterest: str(500),
    x: str(500),
  },
};

export const ANNOUNCEMENT_SCHEMA: JsonSchema = {
  type: "object",
  required: ["enabled", "text"],
  properties: {
    enabled: { type: "boolean" },
    text: str(200),
    items: { type: "array", maxItems: 10, items: str(120, { minLength: 1 }) },
    href: { type: "string" },
    backgroundColor: hex(),
    textColor: hex(),
    separator: str(5),
    duration: { type: "number", minimum: 5, maximum: 180 },
  },
};

export const STORE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    contactEmail: str(200),
    whatsapp: { type: "string", maxLength: 16 },
  },
};

export const POPULAR_FONTS = [
  "Inter",
  "Anton",
  "Oswald",
  "Montserrat",
  "Poppins",
  "Roboto",
  "Playfair Display",
  "Lora",
  "Bebas Neue",
  "Pinyon Script",
  "DM Sans",
  "Space Grotesk",
  "Archivo",
  "Work Sans",
  "Cormorant Garamond",
  "Raleway",
  "Barlow Condensed",
];
