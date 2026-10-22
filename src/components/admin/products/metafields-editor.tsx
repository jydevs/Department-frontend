"use client";

import { Plus } from "lucide-react";
import { Button, Card, EmptyState, Input, Select, Textarea } from "@/components/admin/ui";
import type { Metafield, MetafieldInput, MetafieldType } from "@/lib/admin/api/products";

export const META_NAMESPACE = "custom";

export interface MetaRow {
  rid: string;
  key: string;
  type: MetafieldType;
  value: string;
  /** true si ya existe en el servidor (su clave no se puede cambiar; quitarla la borra al guardar). */
  existing: boolean;
}

const TYPE_LABELS: Record<MetafieldType, string> = {
  single_line_text: "Texto de una línea",
  multi_line_text: "Texto de varias líneas",
  number_integer: "Número entero",
  number_decimal: "Número decimal",
  boolean: "Sí / No",
  json: "JSON",
  url: "URL",
  color: "Color",
};

let counter = 0;
export function newRid(): string {
  counter += 1;
  return `m${Date.now().toString(36)}${counter}`;
}

export function rowsFromServer(list: Metafield[] | undefined): MetaRow[] {
  return (list ?? [])
    .filter((m) => m.namespace === META_NAMESPACE)
    .map((m) => ({ rid: newRid(), key: m.key, type: m.type, value: m.value, existing: true }));
}

/** Filas nuevas o modificadas respecto al servidor, listas para el PUT (upsert). */
export function changedRows(rows: MetaRow[], server: Metafield[] | undefined): MetafieldInput[] {
  const base = new Map((server ?? []).filter((m) => m.namespace === META_NAMESPACE).map((m) => [m.key, m]));
  const out: MetafieldInput[] = [];
  for (const r of rows) {
    if (!r.key.trim()) continue;
    const prev = base.get(r.key);
    if (!prev || prev.type !== r.type || prev.value !== r.value) out.push({ namespace: META_NAMESPACE, key: r.key.trim(), type: r.type, value: r.value });
  }
  return out;
}

/** Claves del servidor (espacio «custom») que el usuario quitó de la lista: se borran al guardar. */
export function removedKeys(rows: MetaRow[], server: Metafield[] | undefined): string[] {
  const kept = new Set(rows.map((r) => r.key.trim()));
  return (server ?? []).filter((m) => m.namespace === META_NAMESPACE && !kept.has(m.key)).map((m) => m.key);
}

export function validateRows(rows: MetaRow[]): Record<string, { key?: string; value?: string }> {
  const errors: Record<string, { key?: string; value?: string }> = {};
  const seen = new Set<string>();
  for (const r of rows) {
    const e: { key?: string; value?: string } = {};
    const key = r.key.trim();
    if (!key) {
      if (r.value) e.key = "Falta la clave.";
    } else {
      if (!/^[a-z0-9_-]+$/i.test(key) || key.length > 60) e.key = "Usa letras, números, guion y guion bajo (máx. 60).";
      else if (seen.has(key.toLowerCase())) e.key = "Clave repetida.";
      seen.add(key.toLowerCase());
      if (r.value.length > 5000) e.value = "Máximo 5000 caracteres.";
      else if (r.type === "number_integer" && !Number.isInteger(Number(r.value))) e.value = "Debe ser un entero.";
      else if (r.type === "number_decimal" && (r.value.trim() === "" || Number.isNaN(Number(r.value)))) e.value = "Debe ser un número.";
      else if (r.type === "boolean" && r.value !== "true" && r.value !== "false") e.value = "Elige Sí o No.";
      else if (r.type === "color" && !/^#[0-9A-Fa-f]{6}$/.test(r.value)) e.value = "Formato #RRGGBB.";
      else if (r.type === "url") {
        try {
          const u = new URL(r.value);
          if (u.protocol !== "http:" && u.protocol !== "https:") e.value = "Solo http o https.";
        } catch {
          e.value = "URL no válida.";
        }
      } else if (r.type === "json") {
        try {
          JSON.parse(r.value);
        } catch {
          e.value = "JSON no válido.";
        }
      }
    }
    if (e.key || e.value) errors[r.rid] = e;
  }
  return errors;
}

interface Props {
  rows: MetaRow[];
  onChange: (rows: MetaRow[]) => void;
  readOnly?: boolean;
  loading?: boolean;
  /** Errores del servidor por índice de fila (opcional). */
  errors?: Record<string, { key?: string; value?: string }>;
}

function ValueInput({ row, onChange, error, disabled }: { row: MetaRow; onChange: (v: string) => void; error?: string; disabled?: boolean }) {
  const label = `Valor de ${row.key || "la clave"}`;
  switch (row.type) {
    case "boolean":
      return (
        <Select label={label} value={row.value} error={error} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">Elige…</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </Select>
      );
    case "multi_line_text":
    case "json":
      return <Textarea label={label} rows={3} value={row.value} error={error} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={row.type === "json" ? "font-mono text-xs" : undefined} />;
    case "color":
      return (
        <div className="flex items-end gap-2">
          <Input label={label} value={row.value} error={error} disabled={disabled} placeholder="#000000" wrapperClassName="flex-1" onChange={(e) => onChange(e.target.value)} />
          <input
            type="color"
            aria-label={`Selector de color de ${row.key || "la clave"}`}
            disabled={disabled}
            value={/^#[0-9A-Fa-f]{6}$/.test(row.value) ? row.value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border border-border-strong bg-surface-2 p-0.5"
          />
        </div>
      );
    default:
      return (
        <Input
          label={label}
          value={row.value}
          error={error}
          disabled={disabled}
          inputMode={row.type === "number_integer" ? "numeric" : row.type === "number_decimal" ? "decimal" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function MetafieldsEditor({ rows, onChange, readOnly, loading, errors }: Props) {
  const set = (rid: string, patch: Partial<MetaRow>) => onChange(rows.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));
  return (
    <Card
      title="Metafields"
      description={`Datos extra del espacio «${META_NAMESPACE}» que la tienda puede mostrar.`}
      actions={
        readOnly ? null : (
          <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} onClick={() => onChange([...rows, { rid: newRid(), key: "", type: "single_line_text", value: "", existing: false }])} disabled={rows.length >= 50}>
            Añadir
          </Button>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin metafields" description={readOnly ? undefined : "Añade pares clave/valor personalizados."} className="py-6" />
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.rid} className="grid gap-3 rounded-md border border-border bg-surface-2/40 p-3 sm:grid-cols-[1fr_1fr_2fr]">
              <Input label="Clave" value={r.key} disabled={readOnly || r.existing} error={errors?.[r.rid]?.key} onChange={(e) => set(r.rid, { key: e.target.value })} />
              <Select label="Tipo" value={r.type} disabled={readOnly} onChange={(e) => set(r.rid, { type: e.target.value as MetafieldType })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              <ValueInput row={r} disabled={readOnly} error={errors?.[r.rid]?.value} onChange={(v) => set(r.rid, { value: v })} />
              {!readOnly ? (
                <div className="sm:col-span-3">
                  <Button size="sm" variant="ghost" onClick={() => onChange(rows.filter((x) => x.rid !== r.rid))}>
                    {r.existing ? "Eliminar metafield" : "Quitar fila"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
