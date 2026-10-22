import type { BlockData, ContentKind, MenuItemData, SectionData } from "@/lib/admin/api/content";
import { deepEqual, humanizeKey, isObj, type Obj } from "./content-utils";

export type DiffKind = "added" | "removed" | "changed" | "moved";

export interface FieldChange {
  field: string;
  before?: string;
  after?: string;
}

export interface DiffEntry {
  kind: DiffKind;
  title: string;
  subtitle?: string;
  fields: FieldChange[];
}

const GROUP_LABELS: Record<string, string> = {
  brand: "Marca",
  theme: "Tema",
  colors: "Colores",
  fonts: "Tipografías",
  colorScheme: "Esquema de color",
  seo: "SEO",
  social: "Redes sociales",
  announcement: "Anuncios",
  store: "Tienda",
  name: "Nombre",
  tagline: "Eslogan",
  description: "Descripción",
  logoMediaUrl: "Logo",
  titleTemplate: "Plantilla del título",
  defaultTitle: "Título de inicio",
  defaultDescription: "Descripción por defecto",
  ogImageUrl: "Imagen para compartir",
  enabled: "Activado",
  background: "Fondo",
  foreground: "Texto",
  accent: "Acento",
  accentDark: "Acento oscuro",
  accentLight: "Acento claro",
  muted: "Texto atenuado",
  border: "Bordes",
  info: "Color secundario",
  contactEmail: "Correo de contacto",
  whatsapp: "WhatsApp",
  seoTitle: "Título SEO",
  seoDescription: "Descripción SEO",
  title: "Título",
  handle: "Handle",
};

function labelFor(key: string): string {
  return GROUP_LABELS[key] ?? humanizeKey(key);
}

export function shortVal(v: unknown): string {
  if (v === undefined || v === null || v === "") return "(vacío)";
  if (typeof v === "string") return v.length > 60 ? `“${v.slice(0, 57).replace(/\n/g, " ")}…”` : `“${v.replace(/\n/g, " ")}”`;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `${v.length} elemento${v.length === 1 ? "" : "s"}`;
  return "…";
}

/** Cambios hoja entre dos valores. `label` convierte cada segmento de la ruta a texto legible. */
export function leafChanges(a: unknown, b: unknown, path: string[] = [], label: (k: string) => string = labelFor): FieldChange[] {
  if (deepEqual(a, b)) return [];
  if (isObj(a) && isObj(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap((k) => leafChanges(a[k], b[k], [...path, k], label));
  }
  if (Array.isArray(a) && Array.isArray(b) && (a.some(isObj) || b.some(isObj))) {
    const n = Math.max(a.length, b.length);
    const out: FieldChange[] = [];
    for (let i = 0; i < n; i++) {
      for (const c of leafChanges(a[i], b[i], [...path, `#${i + 1}`], label)) out.push(c);
    }
    return out;
  }
  const name = path.map((p) => (p.startsWith("#") ? `n.º ${p.slice(1)}` : label(p))).join(" › ") || "Valor";
  return [{ field: name, before: shortVal(a), after: shortVal(b) }];
}

/** Índices estables (subsecuencia creciente más larga): los demás se consideran "movidos". */
function stableSet(seq: number[]): Set<number> {
  const n = seq.length;
  const len = new Array<number>(n).fill(1);
  const prev = new Array<number>(n).fill(-1);
  let best = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) if (seq[j] < seq[i] && len[j] + 1 > len[i]) {
      len[i] = len[j] + 1;
      prev[i] = j;
    }
    if (len[i] > len[best]) best = i;
  }
  const out = new Set<number>();
  for (let i = n ? best : -1; i >= 0; i = prev[i]) out.add(i);
  return out;
}

function blockChanges(before: BlockData[] = [], after: BlockData[] = []): FieldChange[] {
  const out: FieldChange[] = [];
  const bm = new Map(before.map((b) => [b.id, b]));
  const am = new Map(after.map((b) => [b.id, b]));
  for (const b of after) if (!bm.has(b.id)) out.push({ field: `Bloque añadido (${labelFor(b.type)})` });
  for (const b of before) if (!am.has(b.id)) out.push({ field: `Bloque eliminado (${labelFor(b.type)})` });
  const common = after.filter((b) => bm.has(b.id));
  const order = common.map((b) => before.findIndex((x) => x.id === b.id));
  const stable = stableSet(order);
  if (order.some((_, i) => !stable.has(i))) out.push({ field: "Bloques reordenados" });
  common.forEach((b, i) => {
    const old = bm.get(b.id)!;
    for (const c of leafChanges(old.settings, b.settings)) out.push({ ...c, field: `Bloque ${before.findIndex((x) => x.id === b.id) + 1}: ${c.field}` });
    if (old.type !== b.type) out.push({ field: `Bloque ${i + 1}: tipo`, before: old.type, after: b.type });
  });
  return out;
}

export function diffSections(before: SectionData[], after: SectionData[], typeLabel: (type: string) => string): DiffEntry[] {
  const out: DiffEntry[] = [];
  const bm = new Map(before.map((s) => [s.id, s]));
  const am = new Map(after.map((s) => [s.id, s]));
  const name = (s: SectionData) => typeLabel(s.type);
  for (const s of before) if (!am.has(s.id)) out.push({ kind: "removed", title: name(s), subtitle: "Sección eliminada", fields: [] });
  for (const s of after) if (!bm.has(s.id)) out.push({ kind: "added", title: name(s), subtitle: "Sección añadida", fields: [] });
  const common = after.filter((s) => bm.has(s.id));
  const order = common.map((s) => before.findIndex((x) => x.id === s.id));
  const stable = stableSet(order);
  common.forEach((s, i) => {
    const old = bm.get(s.id)!;
    const fields: FieldChange[] = [];
    if (old.enabled !== s.enabled) fields.push({ field: "Visibilidad", before: old.enabled ? "Activa" : "Desactivada", after: s.enabled ? "Activa" : "Desactivada" });
    fields.push(...leafChanges(old.settings, s.settings));
    fields.push(...blockChanges(old.blocks, s.blocks));
    const moved = !stable.has(i);
    if (fields.length) out.push({ kind: "changed", title: name(s), subtitle: moved ? "Modificada y movida" : "Modificada", fields });
    else if (moved) out.push({ kind: "moved", title: name(s), subtitle: `Movida a la posición ${after.findIndex((x) => x.id === s.id) + 1}`, fields: [] });
  });
  return out;
}

interface FlatMenu {
  item: MenuItemData;
  parent: string | null;
  index: number;
}

function flattenMenu(items: MenuItemData[], parent: string | null = null, acc: Map<string, FlatMenu> = new Map()): Map<string, FlatMenu> {
  items.forEach((item, index) => {
    acc.set(item.id, { item, parent, index });
    if (item.children) flattenMenu(item.children, item.id, acc);
  });
  return acc;
}

function linkText(l: MenuItemData["link"] | undefined): string {
  if (!l) return "(sin enlace)";
  if (l.type === "url") return l.url;
  return `${l.type === "collection" ? "Colección" : l.type === "product" ? "Producto" : "Página"}: ${l.handle}`;
}

export function diffMenu(before: MenuItemData[], after: MenuItemData[]): DiffEntry[] {
  const bm = flattenMenu(before);
  const am = flattenMenu(after);
  const out: DiffEntry[] = [];
  for (const [id, f] of bm) if (!am.has(id)) out.push({ kind: "removed", title: f.item.label, subtitle: "Ítem eliminado", fields: [] });
  for (const [id, f] of am) {
    const old = bm.get(id);
    if (!old) {
      out.push({ kind: "added", title: f.item.label, subtitle: "Ítem añadido", fields: [] });
      continue;
    }
    const fields: FieldChange[] = [];
    if (old.item.label !== f.item.label) fields.push({ field: "Etiqueta", before: shortVal(old.item.label), after: shortVal(f.item.label) });
    if (!deepEqual(old.item.link, f.item.link)) fields.push({ field: "Enlace", before: linkText(old.item.link), after: linkText(f.item.link) });
    if (fields.length) out.push({ kind: "changed", title: f.item.label, subtitle: "Modificado", fields });
    else if (old.parent !== f.parent || old.index !== f.index) out.push({ kind: "moved", title: f.item.label, subtitle: "Movido o cambiado de nivel", fields: [] });
  }
  return out;
}

/** Diferencias entre dos versiones de un documento, listas para mostrar al usuario. */
export function diffDocument(kind: ContentKind, before: Obj | null, after: Obj, typeLabel: (type: string) => string): DiffEntry[] {
  if (!before) return [{ kind: "added", title: "Primera publicación", subtitle: "Todo el contenido es nuevo", fields: [] }];
  if (kind === "menu") {
    return diffMenu((before.items as MenuItemData[]) ?? [], (after.items as MenuItemData[]) ?? []);
  }
  if (kind === "template" || kind === "page") {
    const out: DiffEntry[] = [];
    if (kind === "page") {
      const head: Obj = { title: before.title, seoTitle: before.seoTitle, seoDescription: before.seoDescription };
      const headAfter: Obj = { title: after.title, seoTitle: after.seoTitle, seoDescription: after.seoDescription };
      const fields = leafChanges(head, headAfter);
      if (fields.length) out.push({ kind: "changed", title: "Datos de la página", subtitle: "Título y SEO", fields });
    }
    out.push(...diffSections((before.sections as SectionData[]) ?? [], (after.sections as SectionData[]) ?? [], typeLabel));
    return out;
  }
  const fields = leafChanges(before, after);
  if (!fields.length) return [];
  const grouped = new Map<string, FieldChange[]>();
  for (const f of fields) {
    const [group, ...rest] = f.field.split(" › ");
    const arr = grouped.get(group) ?? [];
    arr.push({ ...f, field: rest.join(" › ") || group });
    grouped.set(group, arr);
  }
  return [...grouped.entries()].map(([group, fs]) => ({ kind: "changed" as const, title: group, subtitle: "Modificado", fields: fs }));
}
