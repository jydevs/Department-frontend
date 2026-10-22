"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Send } from "lucide-react";
import { Badge, Button, Card, ErrorState, Input, PageHeader, Skeleton, Switch, Tabs, TabPanel, Textarea, useToast } from "@/components/admin/ui";
import { Notice, apiMessage, PermissionGate } from "@/components/admin/settings/shared";
import { useAuth } from "@/lib/admin/auth";
import { useCan } from "@/lib/admin/permissions";
import { ApiError } from "@/lib/admin/errors";
import {
  SAMPLE_DATA,
  SENSITIVE_TEMPLATES,
  TEMPLATE_LABELS,
  useEmailTemplate,
  usePreviewEmail,
  useSaveEmailTemplate,
  useTestSendEmail,
  type EmailPreview,
  type EmailTemplate,
} from "@/lib/admin/api/emails";

const CSP = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:";

function previewDocument(html: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><base target="_blank"></head><body style="margin:0">${html}</body></html>`;
}

function problemsOf(e: unknown): string[] {
  if (e instanceof ApiError && e.code === "INVALID_TEMPLATE" && typeof e.details === "object" && e.details !== null) {
    const p = (e.details as { problems?: unknown }).problems;
    if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function VariableChips({ variables, onInsert }: { variables: string[]; onInsert?: (v: string) => void }) {
  const toast = useToast();
  const copy = async (v: string) => {
    const token = `{{ ${v} }}`;
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`Copiado ${token}`);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
    onInsert?.(v);
  };
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Variables permitidas">
      {variables.map((v) => (
        <li key={v}>
          <button
            type="button"
            onClick={() => copy(v)}
            title="Copiar al portapapeles"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-2 py-1 font-mono text-xs hover:bg-surface-3"
          >
            <Copy aria-hidden size={11} className="text-muted" />
            {`{{ ${v} }}`}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PreviewPanel({ template }: { template: EmailTemplate }) {
  const toast = useToast();
  const preview = usePreviewEmail(template.key);
  const [sample, setSample] = useState<Record<string, string>>(() => {
    const base = SAMPLE_DATA[template.key] ?? {};
    return Object.fromEntries(template.variables.map((v) => [v, base[v] ?? ""]));
  });
  const [tab, setTab] = useState("html");
  const [result, setResult] = useState<EmailPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      setResult(await preview.mutateAsync(sample));
    } catch (e) {
      setError(apiMessage(e));
    }
  };

  // vista previa inicial y tras cada guardado (el servidor renderiza la versión GUARDADA)
  useEffect(() => {
    if (lastSaved.current === template.updatedAt) return;
    lastSaved.current = template.updatedAt;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.updatedAt]);

  return (
    <Card title="Vista previa" description="Se renderiza la versión guardada con los datos de ejemplo de abajo.">
      <div className="space-y-4">
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Datos de ejemplo ({template.variables.length})</summary>
          <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
            {template.variables.map((v) => (
              <Input key={v} label={v} value={sample[v] ?? ""} onChange={(e) => setSample((s) => ({ ...s, [v]: e.target.value }))} maxLength={500} className="font-mono text-xs" />
            ))}
          </div>
        </details>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" onClick={run} loading={preview.isPending}>
            Actualizar vista previa
          </Button>
          {result ? (
            <p className="min-w-0 truncate text-sm">
              <span className="text-muted">Asunto: </span>
              <strong>{result.subject}</strong>
            </p>
          ) : null}
        </div>
        {error ? (
          <Notice tone="danger">{error}</Notice>
        ) : result ? (
          <>
            <Tabs
              base="mail-preview"
              aria-label="Formato de la vista previa"
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "html", label: "HTML" },
                { key: "text", label: "Texto" },
              ]}
            />
            <TabPanel base="mail-preview" tabKey="html" active={tab === "html"} className="!pt-3">
              <iframe title="Vista previa del correo" sandbox="" srcDoc={previewDocument(result.bodyHtml)} className="h-[480px] w-full rounded-md border border-border bg-white" />
            </TabPanel>
            <TabPanel base="mail-preview" tabKey="text" active={tab === "text"} className="!pt-3">
              <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">{result.bodyText}</pre>
            </TabPanel>
          </>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>
      <TestSend templateKey={template.key} onError={(m) => toast.error(m)} />
    </Card>
  );
}

function TestSend({ templateKey, onError }: { templateKey: string; onError: (m: string) => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const send = useTestSendEmail(templateKey);
  const [to, setTo] = useState(user?.email ?? "");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setErr(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) return setErr("Escribe un correo válido.");
    try {
      await send.mutateAsync(to.trim());
      toast.success(`Envío de prueba en cola hacia ${to.trim()}`);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 429 ? "Demasiados envíos de prueba (máx. 5 por minuto). Espera un momento." : apiMessage(e);
      setErr(msg);
      onError(msg);
    }
  };
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-medium">Envío de prueba</h3>
      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input aria-label="Correo de destino" type="email" value={to} onChange={(e) => setTo(e.target.value)} error={err} wrapperClassName="min-w-56 flex-1" placeholder="tu@correo.com" />
        <Button type="submit" leftIcon={<Send aria-hidden size={14} />} loading={send.isPending}>
          Enviar prueba
        </Button>
      </form>
      <p className="mt-1.5 text-xs text-muted">Usa la versión guardada y los datos de ejemplo del servidor. Límite: 5 por minuto.</p>
    </div>
  );
}

function EditorForm({ template, canWrite }: { template: EmailTemplate; canWrite: boolean }) {
  const toast = useToast();
  const save = useSaveEmailTemplate(template.key);
  const [subject, setSubject] = useState(template.subject);
  const [html, setHtml] = useState(template.bodyHtml);
  const [text, setText] = useState(template.bodyText);
  const [isActive, setIsActive] = useState(template.isActive);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const dirty = subject !== template.subject || html !== template.bodyHtml || text !== template.bodyText || isActive !== template.isActive;

  const submit = async () => {
    setProblems([]);
    setError(null);
    if (!subject.trim() || !html.trim() || !text.trim()) return setError("El asunto y los dos cuerpos (HTML y texto) son obligatorios.");
    try {
      await save.mutateAsync({ subject: subject.trim(), bodyHtml: html, bodyText: text, isActive });
      toast.success("Plantilla guardada");
    } catch (e) {
      const list = problemsOf(e);
      setProblems(list);
      setError(list.length ? "El servidor rechazó la plantilla:" : apiMessage(e));
      toast.error(list.length ? "Plantilla rechazada: revisa los problemas" : apiMessage(e));
    }
  };

  return (
    <Card title="Contenido" actions={canWrite ? <Switch checked={isActive} onChange={setIsActive} label="Activa" /> : <Badge tone={template.isActive ? "success" : "neutral"} dot>{template.isActive ? "Activa" : "Desactivada"}</Badge>}>
      <div className="space-y-4">
        <Input label="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={255} disabled={!canWrite} hint="Admite variables, p. ej. {{ orderNumber }}." />
        <Textarea label="Cuerpo HTML" value={html} onChange={(e) => setHtml(e.target.value)} rows={16} maxLength={100_000} disabled={!canWrite} spellCheck={false} className="font-mono text-xs" />
        <Textarea label="Cuerpo en texto plano" value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={50_000} disabled={!canWrite} spellCheck={false} className="font-mono text-xs" />
        {error ? (
          <Notice tone="danger" title={error}>
            {problems.length ? (
              <ul className="list-disc pl-5">
                {problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            ) : null}
          </Notice>
        ) : null}
        {canWrite ? (
          <div className="flex justify-end">
            <Button variant="primary" onClick={submit} loading={save.isPending} disabled={!dirty}>
              Guardar plantilla
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function TemplateEditor({ templateKey }: { templateKey: string }) {
  return (
    <PermissionGate perm="marketing:read">
      <TemplateEditorInner templateKey={templateKey} />
    </PermissionGate>
  );
}

function TemplateEditorInner({ templateKey }: { templateKey: string }) {
  const canWriteBase = useCan("marketing:write");
  const { user } = useAuth();
  const query = useEmailTemplate(templateKey);

  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const t = query.data;
  const sensitive = SENSITIVE_TEMPLATES.includes(t.key);
  const privileged = user?.role === "owner" || user?.role === "admin";
  const canWrite = canWriteBase && (!sensitive || privileged);
  const meta = TEMPLATE_LABELS[t.key];

  return (
    <>
      <PageHeader
        title={meta?.name ?? t.key}
        description={meta?.description}
        breadcrumbs={[{ label: "Plantillas de correo", href: "/emails" }, { label: meta?.name ?? t.key }]}
        meta={sensitive ? <Badge tone="warning">Sensible</Badge> : undefined}
      />
      {sensitive && !privileged ? (
        <Notice tone="warning" title="Plantilla sensible" className="mb-4">
          Esta plantilla lleva enlaces de un solo uso: solo propietarios y administradores pueden editarla.
        </Notice>
      ) : null}
      {!canWriteBase ? (
        <Notice className="mb-4" title="Solo lectura">
          Necesitas el permiso <code>marketing:write</code> para editar plantillas y ver la vista previa.
        </Notice>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <EditorForm key={t.updatedAt} template={t} canWrite={canWrite} />
        </div>
        <div className="space-y-5">
          <Card title="Variables permitidas" description="Haz clic para copiar. Solo se admiten estas; cualquier otra será rechazada.">
            <VariableChips variables={t.variables} />
          </Card>
          <Card title="Reglas del servidor">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Se rechaza <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;form&gt;</code>, <code>javascript:</code>, URLs <code>data:</code> y atributos <code>on…=</code>.</li>
              <li>Los enlaces <code>href</code> deben apuntar al dominio de la tienda (https), ser <code>mailto:</code> o una variable de enlace como <code>{"{{ orderUrl }}"}</code>.</li>
              <li>Las variables se escapan en el HTML automáticamente.</li>
              {sensitive ? <li>Esta plantilla es sensible: solo propietario o administrador.</li> : null}
            </ul>
          </Card>
          {canWriteBase ? <PreviewPanel template={t} /> : null}
        </div>
      </div>
    </>
  );
}
