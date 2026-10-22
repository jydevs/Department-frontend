import type { ContentKind, JsonSchema, SectionData, BlockData } from "@/lib/admin/api/content";

/* ------------------------------------------------------------------ */
/* Utilidades de datos                                                 */
/* ------------------------------------------------------------------ */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type Obj = Record<string, unknown>;

export function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  const ao = a as Obj;
  const bo = b as Obj;
  const ak = Object.keys(ao).filter((k) => ao[k] !== undefined);
  const bk = Object.keys(bo).filter((k) => bo[k] !== undefined);
  return ak.length === bk.length && ak.every((k) => deepEqual(ao[k], bo[k]));
}

/** Id aleatorio válido para secciones, blocks y elementos de menú (`^[a-z0-9-]{3,40}$`). */
export function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const p = prefix.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "item";
  return `${p}-${rand}`.slice(0, 40);
}

/** Copia con `path` fijado a `value` (undefined borra la clave). */
export function setIn(root: unknown, path: Array<string | number>, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = Array.isArray(root) ? [...root] : [];
    arr[head] = setIn(arr[head], rest, value);
    return arr;
  }
  const obj: Obj = isObj(root) ? { ...root } : {};
  const next = setIn(obj[head], rest, value);
  if (next === undefined) delete obj[head];
  else obj[head] = next;
  return obj;
}

export function getIn(root: unknown, path: Array<string | number>): unknown {
  let cur: unknown = root;
  for (const p of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string | number, unknown>)[p];
  }
  return cur;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/* ------------------------------------------------------------------ */
/* Validación de enlaces / colores (espejo de las reglas del servidor)  */
/* ------------------------------------------------------------------ */

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const HANDLE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasControlOrSpace(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c <= 0x20 || c === 0x7f) return true;
  }
  return false;
}

/** Misma regla que `isSafeUrl` del backend. */
export function isSafeUrl(value: string, allowMailTel: boolean): boolean {
  if (value.length === 0 || value.length > 2000 || hasControlOrSpace(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  if (value.startsWith("https://")) {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }
  if (allowMailTel) return /^mailto:[^\s@]+@[^\s@]+$/.test(value) || /^tel:\+?[0-9()\-.]{3,30}$/.test(value);
  return false;
}

export function linkError(value: string): string | null {
  return isSafeUrl(value, true) ? null : "Usa https://…, una ruta que empiece por /, mailto: o tel:";
}

export function imageUrlError(value: string): string | null {
  if (value.startsWith("http://")) return "El servidor solo acepta imágenes con https:// o una ruta /… (la URL pública del backend debe ser https)";
  return isSafeUrl(value, false) ? null : "Usa https://… o una ruta que empiece por / (sin //)";
}

/* ------------------------------------------------------------------ */
/* Etiquetas en español                                                */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Sobretítulo",
  heading: "Titular",
  headingAccent: "Acento del titular",
  headingOutline: "Titular con contorno",
  subheading: "Subtítulo",
  lede: "Párrafo destacado",
  body: "Contenido (Markdown)",
  text: "Texto",
  lead: "Línea destacada",
  title: "Título",
  label: "Etiqueta",
  imageUrl: "Imagen",
  imageAlt: "Texto alternativo de la imagen",
  imageBadge: "Etiqueta sobre la imagen",
  imagePosition: "Posición de la imagen",
  mobileImageUrl: "Imagen para móvil",
  alt: "Texto alternativo",
  caption: "Pie de foto",
  aspect: "Proporción",
  ctaLabel: "Texto del botón",
  ctaHref: "Enlace del botón",
  ctaVariant: "Estilo del botón",
  secondaryCtaLabel: "Texto del botón secundario",
  secondaryCtaHref: "Enlace del botón secundario",
  secondaryCtaVariant: "Estilo del botón secundario",
  href: "Enlace",
  url: "Enlace",
  links: "Enlaces",
  menuKey: "Menú",
  collectionHandle: "Colección",
  productHandle: "Producto",
  overlayOpacity: "Opacidad de la capa",
  overlayColor: "Color de la capa",
  backgroundColor: "Color de fondo",
  textColor: "Color del texto",
  separator: "Separador",
  separatorColor: "Color del separador",
  alignment: "Alineación",
  height: "Altura",
  minHeight: "Altura mínima",
  kenBurns: "Zoom lento en la foto",
  parallax: "Efecto parallax",
  grayscale: "Foto en blanco y negro",
  scrollLabel: "Texto del indicador de scroll",
  scrollTargetId: "Id de la sección a la que baja",
  anchorId: "Id de ancla",
  dismissible: "Se puede cerrar",
  speed: "Velocidad",
  duration: "Segundos por vuelta",
  variant: "Estilo",
  size: "Tamaño",
  bordered: "Con bordes arriba y abajo",
  ariaLabel: "Etiqueta accesible",
  showCount: "Mostrar contador de piezas",
  countLabel: "Etiqueta del contador",
  numbered: "Numerar los mosaicos",
  columns: "Columnas",
  icon: "Icono",
  limit: "Cantidad máxima",
  layout: "Diseño",
  showNumbers: "Mostrar numeración",
  showCaptions: "Mostrar pies de foto",
  placeholder: "Texto de ayuda del campo",
  inputLabel: "Etiqueta del campo (oculta)",
  buttonLabel: "Texto del botón",
  loadingMessage: "Mensaje mientras envía",
  successMessage: "Mensaje de éxito",
  errorMessage: "Mensaje de error",
  showNewsletter: "Mostrar boletín en el pie",
  showSocial: "Mostrar redes sociales",
  brandTitle: "Titular de la marca",
  brandText: "Texto de la marca",
  wordmark: "Logotipo de texto gigante",
  showWordmark: "Mostrar logotipo de texto",
  copyright: "Copyright",
  bottomText: "Texto inferior",
  backToTopLabel: "Texto de «volver arriba»",
  source: "Origen de los productos",
  showFilters: "Mostrar filtros",
  srHeading: "Título para lectores de pantalla",
  logoVariant: "Variante del logotipo",
  showAnnouncement: "Mostrar barra de anuncios",
  showSearch: "Mostrar búsqueda",
  showAccount: "Mostrar cuenta",
  showCart: "Mostrar carrito",
  showProductCount: "Mostrar número de productos",
  transparentOnHero: "Transparente sobre el hero",
  showPhone: "Pedir teléfono",
  submitLabel: "Texto del botón de enviar",
  tabsLabel: "Etiqueta de las pestañas",
  showTabs: "Mostrar pestañas",
  code: "Código",
  maxWidth: "Ancho máximo",
  maxQuantity: "Cantidad máxima por compra",
  checkoutHref: "Enlace del pago",
  accountLabel: "Texto de «Mi cuenta»",
  cartLabel: "Texto de «Carrito»",
  emptyTitle: "Título del estado vacío",
  emptyText: "Texto del estado vacío",
  popularLimit: "Cantidad de populares",
  stickyAddToCart: "Botón de compra fijo",
  showDiscountBadge: "Mostrar etiqueta de descuento",
  mobileMenuTagline: "Frase del menú móvil",
  homeAriaLabel: "Etiqueta accesible del inicio",
  name: "Nombre",
  tagline: "Eslogan",
  description: "Descripción",
  logoMediaUrl: "Logotipo",
  titleTemplate: "Plantilla del título",
  defaultTitle: "Título de la página de inicio",
  defaultDescription: "Descripción por defecto",
  ogImageUrl: "Imagen para compartir en redes",
  enabled: "Mostrar la barra de anuncios",
  contactEmail: "Correo de contacto",
  whatsapp: "WhatsApp",
  colorScheme: "Esquema de color de la tienda",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  pinterest: "Pinterest",
  x: "X (Twitter)",
  background: "Fondo",
  foreground: "Texto principal",
  accent: "Acento",
  accentDark: "Acento oscuro",
  accentLight: "Acento claro",
  muted: "Texto atenuado",
  border: "Bordes",
  info: "Color secundario (acciones)",
  gray100: "Gris 100",
  gray300: "Gris 300",
  gray500: "Gris 500",
  gray900: "Gris 900",
};

export function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ENUM_LABELS: Record<string, string> = {
  left: "Izquierda",
  center: "Centro",
  right: "Derecha",
  medium: "Medio",
  large: "Grande",
  full: "Pantalla completa",
  slow: "Lenta",
  normal: "Normal",
  fast: "Rápida",
  band: "Franja de color",
  outline: "Contorno",
  plain: "Texto simple",
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
  solid: "Sólido",
  red: "Rojo",
  black: "Negro",
  stacked: "Apilado",
  split: "Dividido",
  "text-only": "Solo texto",
  "image-left": "Imagen a la izquierda",
  "image-right": "Imagen a la derecha",
  grid: "Cuadrícula",
  carousel: "Carrusel",
  masonry: "Mosaico",
  "current-collection": "Productos de la colección actual",
  related: "Productos relacionados",
  collection: "Una colección concreta",
  narrow: "Estrecho",
  wide: "Ancho",
  dark: "Oscuro",
  light: "Claro",
  truck: "Camión (envíos)",
  shield: "Escudo (garantía)",
  refresh: "Flechas (cambios)",
  "credit-card": "Tarjeta (pagos)",
  heart: "Corazón",
  star: "Estrella",
  gift: "Regalo",
  chat: "Chat",
  leaf: "Hoja",
  clock: "Reloj",
  eye: "Ojo",
  user: "Usuario",
  tag: "Etiqueta",
};

export function enumLabel(v: string): string {
  return ENUM_LABELS[v] ?? v;
}

/* ------------------------------------------------------------------ */
/* Clasificación de campos a partir del nombre / esquema               */
/* ------------------------------------------------------------------ */

export type FieldKind = "image" | "link" | "color" | "markdown" | "ref-collection" | "ref-product" | "ref-menu" | "ref-page" | "handle" | "text" | "textarea";

export function classifyString(name: string, s: JsonSchema): FieldKind {
  const n = name.toLowerCase();
  if (s.pattern && s.pattern.includes("0-9a-fA-F") ) return "color";
  if (n === "collectionhandle" || n === "breadcrumbcollectionhandle") return "ref-collection";
  if (n === "producthandle") return "ref-product";
  if (n === "menukey") return "ref-menu";
  if (n === "pagehandle") return "ref-page";
  if (s.pattern === HANDLE_RE.source) return "handle";
  if (s.pattern) return "text";
  if (s.enum) return "text";
  if (!s.maxLength || s.maxLength === 2000) {
    if (n.includes("image") || n === "src" || n === "poster" || n === "logo" || n.endsWith("mediaurl") || n === "ogimageurl") return "image";
    if (n === "href" || n === "url" || n.endsWith("href") || n.endsWith("url") || n === "link") return "link";
  }
  if (n === "body" && (s.maxLength ?? 0) >= 1000) return "markdown";
  if ((s.maxLength ?? 0) >= 1000) return "markdown";
  if (n === "heading" || n === "lede" || (s.maxLength ?? 0) >= 300) return "textarea";
  return "text";
}

/* ------------------------------------------------------------------ */
/* Valores por defecto de secciones y blocks                           */
/* ------------------------------------------------------------------ */

export const FALLBACK_IMAGE = "/images/home-hero.jpg";

const REQUIRED_TEXT: Record<string, string> = {
  heading: "Titular de la sección",
  body: "Escribe aquí el contenido de la sección.",
  text: "Texto",
  title: "Título",
  label: "Etiqueta",
  alt: "Descripción de la imagen",
  code: "404",
  ctaLabel: "Ver más",
};

function placeholderString(name: string, s: JsonSchema, image: string): string {
  const kind = classifyString(name, s);
  if (s.enum && s.enum.length) return String(s.enum[0]);
  if (kind === "color") return "#000000";
  if (kind === "image") return image;
  if (kind === "link") return "/";
  if (kind === "handle" || kind === "ref-collection") return "all";
  if (kind === "ref-menu") return "main";
  if (kind === "ref-product" || kind === "ref-page") return "";
  const base = REQUIRED_TEXT[name] ?? "Texto";
  return s.maxLength ? base.slice(0, s.maxLength) : base;
}

function defaultFor(name: string, s: JsonSchema, image: string): unknown {
  if (s.default !== undefined) return clone(s.default);
  switch (s.type) {
    case "string":
      return placeholderString(name, s, image);
    case "number":
    case "integer":
      return s.minimum ?? 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return buildDefaults(s, image);
    default:
      return null;
  }
}

/** Objeto con los campos obligatorios y los que tienen valor por defecto. Pensado para pasar la validación del servidor. */
export function buildDefaults(schema: JsonSchema, image: string = FALLBACK_IMAGE): Obj {
  const out: Obj = {};
  const required = new Set(schema.required ?? []);
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.default !== undefined) out[name] = clone(prop.default);
    else if (required.has(name)) out[name] = defaultFor(name, prop, image);
  }
  return out;
}

/** Bloques iniciales al crear una sección (para que la vista previa no salga vacía). */
export const STARTER_BLOCKS: Record<string, { type: string; count: number }> = {
  marquee: { type: "item", count: 3 },
  "value-props": { type: "item", count: 3 },
  "split-banner": { type: "tile", count: 2 },
};

export const MAX_BLOCKS_FALLBACK: Record<string, number> = {
  marquee: 20,
  "split-banner": 4,
  "value-props": 8,
  lookbook: 24,
  footer: 6,
  "collection-hero": 8,
  "search-panel": 8,
};

export function makeBlock(sectionType: string, blockType: string, schema: JsonSchema, image: string, index = 0): BlockData {
  const settings = buildDefaults(schema, image);
  if (sectionType === "split-banner" && blockType === "tile" && settings.collectionHandle === undefined && settings.href === undefined) {
    settings.collectionHandle = "all";
    settings.label = index === 0 ? "Colección" : `Colección ${index + 1}`;
  }
  if (sectionType === "marquee") settings.text = ["Nueva colección", "Envíos a toda Colombia", "Edición limitada"][index] ?? "Texto";
  if (sectionType === "value-props") {
    settings.title = ["Envíos rápidos", "Pago seguro", "Cambios fáciles"][index] ?? "Ventaja";
    settings.text = "Describe esta ventaja en una frase corta.";
  }
  return { id: uid(blockType), type: blockType, settings };
}

/* ------------------------------------------------------------------ */
/* Ruta de vista previa en la tienda                                   */
/* ------------------------------------------------------------------ */

export function previewPathFor(kind: ContentKind, key: string, productHandle?: string | null): string {
  if (kind === "page") return `/pages/${key}`;
  if (kind === "template") {
    switch (key) {
      case "collection":
        return "/collections/all";
      case "product":
        return productHandle ? `/products/${productHandle}` : "/collections/all";
      case "cart":
        return "/cart";
      case "search":
        return "/search";
      case "404":
        return "/no-existe";
      default:
        return "/";
    }
  }
  return "/";
}

/* ------------------------------------------------------------------ */
/* Errores del servidor → secciones                                    */
/* ------------------------------------------------------------------ */

/** Cuántos errores hay por índice de sección (`sections.2.settings.x` → 2). */
export function sectionErrorCounts(errors: Record<string, string>): Map<number, number> {
  const out = new Map<number, number>();
  for (const path of Object.keys(errors)) {
    const m = /^sections\.(\d+)(?:\.|$)/.exec(path);
    if (m) out.set(Number(m[1]), (out.get(Number(m[1])) ?? 0) + 1);
  }
  return out;
}

export function errorsUnder(errors: Record<string, string>, prefix: string): number {
  let n = 0;
  for (const k of Object.keys(errors)) if (k === prefix || k.startsWith(`${prefix}.`)) n += 1;
  return n;
}

export function sectionSummary(section: SectionData): string {
  const s = section.settings;
  const pick = (k: string): string | null => (typeof s[k] === "string" && (s[k] as string).trim() ? (s[k] as string) : null);
  const t = pick("heading") ?? pick("title") ?? pick("text") ?? pick("eyebrow") ?? pick("body") ?? pick("code");
  return t ? t.replace(/\s*\n\s*/g, " · ").slice(0, 70) : "";
}
