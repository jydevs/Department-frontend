"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Bold, Heading2, Heading3, Heading4, Italic, Link2, List, ListOrdered, Pilcrow } from "lucide-react";
import { Button, Dialog, IconButton, Input, Tabs } from "@/components/admin/ui";
import { cn } from "@/lib/admin/utils";
import { SafeHtml } from "./safe-html";

interface Props {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  hint?: string;
  error?: string | null;
  maxLength: number;
  disabled?: boolean;
  rows?: number;
}

const TOOLS: Array<{ id: string; label: string; icon: ReactNode }> = [
  { id: "p", label: "Párrafo", icon: <Pilcrow aria-hidden size={16} /> },
  { id: "strong", label: "Negrita", icon: <Bold aria-hidden size={16} /> },
  { id: "em", label: "Cursiva", icon: <Italic aria-hidden size={16} /> },
  { id: "h2", label: "Título 2", icon: <Heading2 aria-hidden size={16} /> },
  { id: "h3", label: "Título 3", icon: <Heading3 aria-hidden size={16} /> },
  { id: "h4", label: "Título 4", icon: <Heading4 aria-hidden size={16} /> },
  { id: "ul", label: "Lista con viñetas", icon: <List aria-hidden size={16} /> },
  { id: "ol", label: "Lista numerada", icon: <ListOrdered aria-hidden size={16} /> },
  { id: "link", label: "Enlace", icon: <Link2 aria-hidden size={16} /> },
];

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Editor de descripción sencillo y seguro: textarea con barra de formato mínima que genera solo HTML de la
 * lista blanca del servidor (p, br, strong, em, ul, ol, li, h2-h4, a[https]) y una vista previa renderizada
 * con un convertidor propio a elementos React (nunca dangerouslySetInnerHTML). El servidor vuelve a sanear.
 */
export function RichTextEditor({ value, onChange, label = "Descripción", hint, error, maxLength, disabled, rows = 10 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const sel = useRef({ start: 0, end: 0 });
  const id = useId();

  const apply = (build: (selected: string) => string, fallback: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const inserted = build(selected);
    const next = value.slice(0, start) + inserted + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, start + inserted.length);
    });
  };

  const wrap = (tag: string, fallback: string) => apply((s) => `<${tag}>${s}</${tag}>`, fallback);
  const list = (tag: "ul" | "ol") =>
    apply((s) => {
      const items = s
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      return `<${tag}>\n${items.map((i) => `  <li>${escapeText(i)}</li>`).join("\n")}\n</${tag}>`;
    }, "Elemento");

  const openLink = () => {
    const el = ref.current;
    sel.current = { start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length };
    setLinkUrl("https://");
    setLinkErr(null);
    setLinkOpen(true);
  };

  const confirmLink = () => {
    const url = linkUrl.trim();
    if (!/^(https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+0-9\s()-]+)$/i.test(url)) {
      setLinkErr("Usa un enlace https:// válido (también mailto: o tel:).");
      return;
    }
    const { start, end } = sel.current;
    const selected = value.slice(start, end) || url;
    const inserted = `<a href="${url}">${selected}</a>`;
    onChange(value.slice(0, start) + inserted + value.slice(end));
    setLinkOpen(false);
  };

  const over = value.length > maxLength;
  const runTool = (toolId: string) => {
    switch (toolId) {
      case "p":
        return wrap("p", "Texto");
      case "strong":
        return wrap("strong", "texto");
      case "em":
        return wrap("em", "texto");
      case "h2":
      case "h3":
      case "h4":
        return wrap(toolId, "Título");
      case "ul":
      case "ol":
        return list(toolId);
      default:
        return openLink();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </label>
        <Tabs
          aria-label="Modo del editor"
          value={tab}
          onChange={(k) => setTab(k === "preview" ? "preview" : "edit")}
          tabs={[
            { key: "edit", label: "HTML" },
            { key: "preview", label: "Vista previa" },
          ]}
        />
      </div>
      {tab === "edit" ? (
        <>
          <div role="toolbar" aria-label="Formato" className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-2 p-1">
            {TOOLS.map((t) => (
              <IconButton key={t.id} label={t.label} icon={t.icon} size="sm" disabled={disabled} onClick={() => runTool(t.id)} />
            ))}
          </div>
          <textarea
            id={id}
            ref={ref}
            rows={rows}
            value={value}
            disabled={disabled}
            aria-invalid={error || over ? true : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full min-w-0 rounded-md border border-border-strong bg-surface-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text transition-colors hover:border-muted focus:border-focus focus:outline-none focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60",
              (error || over) && "border-danger",
            )}
          />
        </>
      ) : (
        <div id={id} className="min-h-32 rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed" aria-label="Vista previa de la descripción">
          <SafeHtml html={value} />
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <span className={over ? "text-danger" : "text-muted"}>{hint ?? "HTML limitado: p, br, strong, em, ul, ol, li, h2-h4 y enlaces https. El servidor limpia el resto."}</span>
        <span className={cn("tabular-nums", over ? "text-danger" : "text-muted")}>
          {value.length}/{maxLength}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Insertar enlace"
        size="sm"
        footer={
          <>
            <Button onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmLink}>
              Insertar
            </Button>
          </>
        }
      >
        <Input
          data-autofocus=""
          label="Dirección (https)"
          value={linkUrl}
          error={linkErr}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmLink();
            }
          }}
        />
      </Dialog>
    </div>
  );
}
