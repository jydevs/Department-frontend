"use client";
import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { Badge, Card, EmptyState, PageHeader, Skeleton, Tabs } from "@/components/admin/ui/Display";
import { Input, Switch, Textarea } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { useEmailPreview, useEmailTemplates, useSaveEmail, useSendTest } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import type { EmailTemplate } from "@/lib/admin/types";

function Preview({ t, dirty }: { t: EmailTemplate; dirty: boolean }) {
  const { data, isLoading, error } = useEmailPreview(t.key, true, t.updatedAt);
  if (isLoading) return <Skeleton className="h-72" />;
  if (error || !data) return <p role="alert" className="text-sm text-accent-text">{errorMessage(error)}</p>;
  return (
    <div>{dirty && <p className="mb-2 rounded-sm bg-surface2 p-2 text-xs text-warn">La vista previa la genera el servidor con la versión guardada: guarda los cambios para verlos aquí.</p>}
      <p className="mb-1 text-xs text-muted">Asunto: <b>{data.subject}</b> <span>(datos de ejemplo)</span></p>
      <iframe title="Vista previa del correo" sandbox="" srcDoc={data.bodyHtml} className="h-80 w-full rounded-sm border border-line bg-white" /></div>
  );
}

function Editor({ initial }: { initial: EmailTemplate }) {
  const [t, setT] = useState(initial), [tab, setTab] = useState<"html" | "text" | "preview">("html"), [test, setTest] = useState(false), [to, setTo] = useState("");
  const save = useSaveEmail(), send = useSendTest(), can = useCan("marketing:write");
  const edited = (x: EmailTemplate) => JSON.stringify([x.subject, x.html, x.text, x.active]);
  const dirty = edited(t) !== edited(initial);
  const used = [...`${t.subject} ${t.html} ${t.text}`.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
  const bad = [...new Set(used.filter((v) => !t.variables.includes(v)))];
  return (
    <Card title={t.name} actions={can ? <span className="flex gap-2"><Button size="sm" icon={<Send className="size-3.5" />} disabled={dirty} title={dirty ? "Guarda antes de enviar la prueba" : undefined} onClick={() => setTest(true)}>Enviar prueba</Button><Button size="sm" variant="primary" loading={save.isPending} disabled={!dirty || bad.length > 0} onClick={() => save.mutate(t)}>Guardar</Button></span> : undefined}>
      <fieldset disabled={!can} className="space-y-3">
        <Input label="Asunto" value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} />
        <label className="flex items-center justify-between text-sm">Plantilla activa<Switch label="Plantilla activa" checked={t.active} onChange={(v) => setT({ ...t, active: v })} /></label>
        <p className="text-xs text-muted">Variables permitidas: {t.variables.map((v) => <code key={v} className="mr-1 rounded bg-surface2 px-1">{`{{${v}}}`}</code>)}</p>
        {bad.length > 0 && <p role="alert" className="text-xs text-accent-text">Variables no permitidas: {bad.join(", ")}</p>}
        <Tabs label="Modo" tabs={[{ key: "html", label: "HTML" }, { key: "text", label: "Texto" }, { key: "preview", label: "Vista previa" }]} value={tab} onChange={setTab} />
        {tab === "html" && <Textarea aria-label="HTML" rows={12} className="font-mono text-xs" value={t.html} onChange={(e) => setT({ ...t, html: e.target.value })} />}
        {tab === "text" && <Textarea aria-label="Texto plano" rows={12} className="font-mono text-xs" value={t.text} onChange={(e) => setT({ ...t, text: e.target.value })} />}
        {tab === "preview" && <Preview t={initial} dirty={dirty} />}
      </fieldset>
      <Dialog open={test} onClose={() => setTest(false)} title="Enviar correo de prueba" size="sm" footer={<><Button onClick={() => setTest(false)}>Cancelar</Button><Button variant="primary" loading={send.isPending} onClick={() => send.mutate({ key: t.key, to }, { onSuccess: () => setTest(false) })}>Enviar</Button></>}>
        <Input label="Enviar a" type="email" value={to} onChange={(e) => setTo(e.target.value)} hint="Se usan datos de ejemplo para las variables (máx. 5 envíos por minuto)." />
      </Dialog>
    </Card>
  );
}

export default function EmailsPage() {
  const { data, isLoading, error } = useEmailTemplates();
  const [key, setKey] = useState<string | null>(null);
  if (isLoading) return <Skeleton className="h-64" />;
  if (error) return <EmptyState icon={<Mail className="size-8" />} title="No se pudieron cargar las plantillas" text={errorMessage(error)} />;
  if (!data?.length) return <EmptyState icon={<Mail className="size-8" />} title="Sin plantillas" />;
  const cur = data.find((t) => t.key === key) ?? data[0];
  return (
    <>
      <PageHeader title="Plantillas de correo" />
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <ul className="space-y-1" aria-label="Plantillas">{data.map((t) => <li key={t.key}><button type="button" aria-current={cur.key === t.key} onClick={() => setKey(t.key)} className={`flex w-full items-center justify-between gap-2 rounded-sm border px-3 py-2 text-left text-sm ${cur.key === t.key ? "border-accent bg-accent/10" : "border-line hover:bg-surface2"}`}>{t.name}{!t.active && <Badge>Inactiva</Badge>}</button></li>)}</ul>
        <Editor key={cur.key} initial={cur} />
      </div>
    </>
  );
}
