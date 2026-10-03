"use client";
import { PagePreview } from "@/components/admin/content/PagePreview";
import { PublishBar } from "@/components/admin/content/PublishBar";
import { SchemaForm } from "@/components/admin/content/SchemaForm";
import { useDraft } from "@/components/admin/content/useDraft";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/admin/ui/Display";
import { Input } from "@/components/admin/ui/Form";
import { useDoc, validateField, type CmsDoc, type CmsField, type JsonValue } from "@/lib/admin/api/content";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";

type Obj = Record<string, JsonValue>;
const FONTS = ["Inter", "Anton", "Oswald", "Pinyon Script", "Helvetica Neue", "Archivo", "Space Grotesk", "Roboto Mono"];
const str = (key: string, label: string, o: Partial<CmsField> = {}): CmsField => ({ key, label, type: "string", ...o });
const color = (key: string, label: string, required = false): CmsField => ({ key, label, type: "color", required });
const HTTPS = "^https://\\S+$";

/** Campos exactamente como los valida el backend (src/cms/schemas/settings.schema.ts). */
const brand: CmsField[] = [str("name", "Nombre de la tienda", { required: true, maxLength: 80 }), str("tagline", "Eslogan", { maxLength: 200 }), { key: "description", label: "Descripción de marca (pie, bloques)", type: "text", maxLength: 500 }, { key: "logoMediaUrl", label: "Logo", type: "image" }];
const colors: CmsField[] = [color("background", "Fondo", true), color("foreground", "Texto", true), color("accent", "Acento", true), color("accentDark", "Acento oscuro"), color("accentLight", "Acento claro"), color("muted", "Texto secundario"), color("border", "Bordes"), color("info", "Color de acción secundaria"), color("gray100", "Gris 100"), color("gray300", "Gris 300"), color("gray500", "Gris 500"), color("gray900", "Gris 900")];
const seo: CmsField[] = [str("titleTemplate", "Plantilla del título", { required: true, maxLength: 120, hint: "Usa %s para el título de la página." }), str("defaultTitle", "Título de la home", { maxLength: 160, hint: "La plantilla no se aplica a la home." }), { key: "defaultDescription", label: "Descripción por defecto", type: "text", required: true, maxLength: 320 }, { key: "ogImageUrl", label: "Imagen para compartir (Open Graph)", type: "image" }];
const social: CmsField[] = ["instagram", "tiktok", "facebook", "youtube", "pinterest", "x"].map((k) => str(k, k[0].toUpperCase() + k.slice(1), { pattern: HTTPS, maxLength: 500, hint: "https://…" }));
const announcement: CmsField[] = [
  { key: "enabled", label: "Mostrar barra de anuncios", type: "boolean" }, str("text", "Texto (una línea)", { required: true, maxLength: 200 }),
  { key: "items", label: "Líneas de la marquesina (si hay, reemplazan al texto)", type: "stringList", maxItems: 10, itemMaxLength: 120 },
  { key: "href", label: "Enlace", type: "url" }, color("backgroundColor", "Color de fondo"), color("textColor", "Color del texto"), str("separator", "Separador", { maxLength: 5 }),
  { key: "duration", label: "Segundos por vuelta", type: "number", min: 5, max: 180 },
];
const store: CmsField[] = [str("contactEmail", "Correo de contacto", { pattern: "^\\S+@\\S+\\.\\S+$", maxLength: 200 }), str("whatsapp", "WhatsApp", { pattern: "^\\+?[0-9]{7,15}$", hint: "Solo dígitos, con + opcional" })];

const sub = (v: JsonValue, path: string[]): Obj => { let c: JsonValue | undefined = v; for (const p of path) c = c && typeof c === "object" && !Array.isArray(c) ? (c as Obj)[p] : undefined; return c && typeof c === "object" && !Array.isArray(c) ? (c as Obj) : {}; };
const setIn = (v: JsonValue, path: string[], val: Obj): JsonValue => {
  const root = { ...((v ?? {}) as Obj) }; let cur = root;
  path.slice(0, -1).forEach((p) => { cur[p] = { ...((cur[p] ?? {}) as Obj) }; cur = cur[p] as Obj; });
  cur[path[path.length - 1]] = val; return root;
};
const fontField = (key: string, label: string, required: boolean, cur: string): CmsField => ({ key, label, type: "enum", required, options: cur && !FONTS.includes(cur) ? [cur, ...FONTS] : FONTS });
const schemeField: CmsField = { key: "colorScheme", label: "Esquema de color", type: "enum", options: ["dark", "light"] };

const groupsFor = (s: JsonValue): { path: string[]; title: string; fields: CmsField[]; cols?: boolean }[] => {
  const fonts = sub(s, ["theme", "fonts"]);
  const g = (k: string) => (typeof fonts[k] === "string" ? (fonts[k] as string) : "");
  return [
    { path: ["brand"], title: "Marca", fields: brand },
    { path: ["theme", "colors"], title: "Colores", fields: colors, cols: true },
    { path: ["theme", "fonts"], title: "Tipografías", fields: [fontField("heading", "Títulos", true, g("heading")), fontField("body", "Texto", true, g("body")), fontField("condensed", "Condensada (menú, botones)", false, g("condensed")), fontField("script", "Decorativa (script)", false, g("script"))], cols: true },
    { path: ["theme"], title: "Tema", fields: [schemeField] },
    { path: ["seo"], title: "SEO por defecto", fields: seo },
    { path: ["social"], title: "Redes sociales", fields: social, cols: true },
    { path: ["announcement"], title: "Barra de anuncios", fields: announcement },
    { path: ["store"], title: "Contacto", fields: store, cols: true },
  ];
};
const countErrors = (v: JsonValue): number => groupsFor(v).reduce((n, g) => { const o = sub(v, g.path); return n + g.fields.filter((f) => validateField(f, o[f.key])).length; }, 0);

function Editor({ doc }: { doc: CmsDoc }) {
  const d = useDraft(doc, countErrors);
  const can = useCan("content:write");
  const groups = groupsFor(d.local);
  return (
    <>
      <PublishBar doc={doc} draft={d} invalidCount={countErrors(d.local)} />
      <fieldset disabled={!can} className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {groups.map((g) => (
            <Card key={g.path.join(".")} title={g.title}>
              <div className={g.cols ? "grid gap-3 sm:grid-cols-2" : undefined}>
                {g.cols
                  ? g.fields.map((f) => <SchemaForm key={f.key} fields={[f]} values={sub(d.local, g.path)} onChange={(v) => d.change(setIn(d.local, g.path, v))} />)
                  : <SchemaForm fields={g.fields} values={sub(d.local, g.path)} onChange={(v) => d.change(setIn(d.local, g.path, v))} />}
              </div>
              {g.path[0] === "store" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Input label="Moneda" value="COP" disabled readOnly /><Input label="Idioma / región" value="es-CO" disabled readOnly /></div>}
            </Card>
          ))}
        </div>
        <Card title="Vista previa de la tienda" className="h-fit xl:sticky xl:top-32"><PagePreview doc={doc} savedAt={d.savedAt} /></Card>
      </fieldset>
    </>
  );
}

export default function SettingsPage() {
  const { data, isLoading, error } = useDoc("settings", "site");
  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <EmptyState title="Ajustes no encontrados" text={error ? errorMessage(error) : undefined} />;
  return (<><PageHeader title="Ajustes y tema" /><Editor key={data.key} doc={data} /></>);
}
