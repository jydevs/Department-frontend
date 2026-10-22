"use client";

import { useState } from "react";
import { Button, Card, ErrorState, Input, NoAccess, PageHeader, Select, Skeleton, TabPanel, Tabs } from "@/components/admin/ui";
import { useCan } from "@/lib/admin/permissions";
import { storefrontLabel } from "@/lib/admin/utils";
import { isObj, setIn, type Obj } from "./content-utils";
import { labelWithCount } from "./fields";
import { PreviewPane } from "./preview-pane";
import { PublishBar } from "./publish-bar";
import { SchemaForm } from "./schema-form";
import { ANNOUNCEMENT_SCHEMA, BRAND_SCHEMA, COLORS_SCHEMA, POPULAR_FONTS, SEO_SCHEMA, SOCIAL_SCHEMA, STORE_SCHEMA } from "./settings-schema";
import { ThemePreview } from "./theme-preview";
import { useDocumentEditor } from "./use-document-editor";

const TABS = [
  { key: "brand", label: "Marca" },
  { key: "theme", label: "Tema" },
  { key: "seo", label: "SEO" },
  { key: "social", label: "Redes" },
  { key: "announcement", label: "Anuncios" },
  { key: "store", label: "Tienda" },
];

function group(data: Obj, key: string): Obj {
  const v = data[key];
  return isObj(v) ? v : {};
}

function validate(data: Obj): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!String(group(data, "brand").name ?? "").trim()) errs["brand.name"] = "El nombre de la marca es obligatorio";
  const fonts = group(group(data, "theme"), "fonts");
  if (!String(fonts.heading ?? "").trim()) errs["theme.fonts.heading"] = "Obligatorio";
  if (!String(fonts.body ?? "").trim()) errs["theme.fonts.body"] = "Obligatorio";
  return errs;
}

/** Cuántos errores hay bajo cada pestaña (para marcarla). */
function tabErrors(errors: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(errors)) {
    const g = k.split(".")[0];
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}

export function SettingsEditor() {
  const canRead = useCan("content:read");
  const editor = useDocumentEditor("settings", "site", { validate });
  const [tab, setTab] = useState("brand");
  const [showStore, setShowStore] = useState(false);

  if (!canRead) return <NoAccess permission="content:read" />;
  const crumbs = [{ label: "Contenido", href: "/content" }, { label: "Ajustes y tema" }];
  if (editor.isLoading) {
    return (
      <>
        <PageHeader title="Ajustes y tema" breadcrumbs={crumbs} />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }
  if (editor.error || !editor.data || !editor.detail) {
    return (
      <>
        <PageHeader title="Ajustes y tema" breadcrumbs={crumbs} />
        <ErrorState error={editor.error ?? new Error("No se pudo cargar")} onRetry={editor.refetch} />
      </>
    );
  }

  const data = editor.data;
  const disabled = !editor.canWrite;
  const counts = tabErrors(editor.errors);
  const setGroup = (key: string, value: Obj) => editor.setData((d) => ({ ...d, [key]: value }));
  const setPath = (path: string[], value: unknown) => editor.setData((d) => setIn(d, path, value) as Obj);
  const theme = group(data, "theme");
  const fonts = group(theme, "fonts");

  const fontInput = (key: "heading" | "body" | "condensed" | "script", label: string, required: boolean, hint: string) => {
    const v = typeof fonts[key] === "string" ? (fonts[key] as string) : "";
    return (
      <>
        <Input
          label={labelWithCount(label, v.length, 80)}
          value={v}
          list="font-suggestions"
          required={required}
          disabled={disabled}
          hint={hint}
          error={editor.errors[`theme.fonts.${key}`]}
          onChange={(e) => setPath(["theme", "fonts", key], !required && e.target.value === "" ? undefined : e.target.value)}
        />
      </>
    );
  };

  return (
    <>
      <PageHeader title="Ajustes y tema" description="Marca, colores, tipografías, SEO, redes y barra de anuncios de toda la tienda." breadcrumbs={crumbs} />
      <PublishBar kind="settings" docKey="site" editor={editor} />
      {disabled ? <p className="mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted">Tienes acceso de solo lectura: puedes ver los ajustes pero no modificarlos.</p> : null}
      <Tabs
        base="settings"
        tabs={TABS.map((t) => ({ ...t, label: counts[t.key] ? `${t.label} (${counts[t.key]} ${counts[t.key] === 1 ? "error" : "errores"})` : t.label }))}
        value={tab}
        onChange={setTab}
        aria-label="Secciones de los ajustes"
      />

      <TabPanel base="settings" tabKey="brand" active={tab === "brand"}>
        <Card title="Marca" description="Nombre, eslogan y logotipo que se muestran en la cabecera, el pie y los correos.">
          <div className="max-w-2xl">
            <SchemaForm schema={BRAND_SCHEMA} value={group(data, "brand")} onChange={(v) => setGroup("brand", v)} errors={editor.errors} path="brand" disabled={disabled} />
          </div>
        </Card>
      </TabPanel>

      <TabPanel base="settings" tabKey="theme" active={tab === "theme"}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card title="Colores" description="Los colores obligatorios definen la base; los demás son opcionales y afinan detalles.">
              <SchemaForm schema={COLORS_SCHEMA} value={group(theme, "colors")} onChange={(v) => setPath(["theme", "colors"], v)} errors={editor.errors} path="theme.colors" disabled={disabled} />
            </Card>
            <Card title="Tipografías" description="Escribe el nombre exacto de una fuente de Google Fonts (p. ej. Anton, Oswald, Inter).">
              <div className="grid gap-4 sm:grid-cols-2">
                {fontInput("heading", "Titulares", true, "Para títulos grandes.")}
                {fontInput("body", "Cuerpo", true, "Para párrafos y descripciones.")}
                {fontInput("condensed", "Condensada", false, "Menú, botones y etiquetas pequeñas.")}
                {fontInput("script", "Decorativa", false, "Detalles manuscritos.")}
              </div>
              <datalist id="font-suggestions">
                {POPULAR_FONTS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <div className="mt-4 max-w-xs">
                <Select
                  label="Esquema de color de la tienda"
                  value={typeof theme.colorScheme === "string" ? theme.colorScheme : ""}
                  disabled={disabled}
                  onChange={(e) => setPath(["theme", "colorScheme"], e.target.value === "" ? undefined : e.target.value)}
                  options={[
                    { value: "", label: "— Sin definir —" },
                    { value: "dark", label: "Oscuro" },
                    { value: "light", label: "Claro" },
                  ]}
                />
              </div>
            </Card>
          </div>
          <div className="min-w-0 xl:sticky xl:top-[calc(var(--topbar-h)+72px)] xl:self-start">
            <Card title="Vista previa en vivo" description="Se actualiza al instante mientras editas (sin guardar).">
              <ThemePreview data={data} />
              <div className="mt-3">
                <Button size="sm" onClick={() => setShowStore((s) => !s)}>
                  {showStore ? "Ocultar la tienda real" : "Ver la tienda con el borrador guardado"}
                </Button>
              </div>
              {showStore ? (
                <div className="mt-3">
                  <PreviewPane kind="settings" docKey="site" path="/" reloadKey={editor.savedTick} dirty={editor.dirty} />
                  <p className="mt-2 text-xs text-muted">Origen de la tienda: {storefrontLabel()}</p>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </TabPanel>

      <TabPanel base="settings" tabKey="seo" active={tab === "seo"}>
        <Card title="SEO por defecto" description="Cómo aparece la tienda en Google y al compartir enlaces. Usa %s en la plantilla del título para insertar el título de cada página.">
          <div className="max-w-2xl">
            <SchemaForm schema={SEO_SCHEMA} value={group(data, "seo")} onChange={(v) => setGroup("seo", v)} errors={editor.errors} path="seo" disabled={disabled} />
          </div>
        </Card>
      </TabPanel>

      <TabPanel base="settings" tabKey="social" active={tab === "social"}>
        <Card title="Redes sociales" description="Direcciones completas (https://…). Los campos vacíos no se muestran en la tienda.">
          <div className="max-w-2xl">
            <SchemaForm schema={SOCIAL_SCHEMA} value={group(data, "social")} onChange={(v) => setGroup("social", v)} errors={editor.errors} path="social" disabled={disabled} />
          </div>
        </Card>
      </TabPanel>

      <TabPanel base="settings" tabKey="announcement" active={tab === "announcement"}>
        <Card title="Barra de anuncios" description="Franja superior de la tienda. Si añades varias frases se muestran como marquesina; arrástralas para reordenarlas.">
          <div className="max-w-2xl">
            <SchemaForm schema={ANNOUNCEMENT_SCHEMA} value={group(data, "announcement")} onChange={(v) => setGroup("announcement", v)} errors={editor.errors} path="announcement" disabled={disabled} />
          </div>
        </Card>
      </TabPanel>

      <TabPanel base="settings" tabKey="store" active={tab === "store"}>
        <Card title="Tienda" description="Datos de contacto y regionales.">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Moneda" value="COP — peso colombiano" readOnly disabled hint="Fija: la tienda opera solo en COP." />
              <Input label="Idioma y región" value="es-CO" readOnly disabled hint="Fijo para esta tienda." />
            </div>
            <SchemaForm schema={STORE_SCHEMA} value={group(data, "store")} onChange={(v) => setGroup("store", v)} errors={editor.errors} path="store" disabled={disabled} />
            <p className="text-xs text-muted">WhatsApp: número con código de país, solo dígitos (p. ej. +573001234567).</p>
          </div>
        </Card>
      </TabPanel>
    </>
  );
}
