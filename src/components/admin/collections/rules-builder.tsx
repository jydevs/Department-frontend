"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, IconButton, Input, MoneyInput, Select, Skeleton } from "@/components/admin/ui";
import { Thumb } from "@/components/admin/products/product-image";
import {
  MAX_CONDITIONS,
  OP_LABELS,
  RULE_FIELDS,
  collectionsApi,
  isValidCondition,
  normalizeRules,
  type CollectionRules,
  type RuleCondition,
  type RuleField,
  type RuleOp,
  type RulePreview,
} from "@/lib/admin/api/collections";
import type { ApiError } from "@/lib/admin/errors";
import { formatCop, formatNumber } from "@/lib/admin/format";
import { useCan } from "@/lib/admin/permissions";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const EMPTY_RULES: CollectionRules = { match: "all", conditions: [{ field: "tag", op: "eq", value: "" }] };

export function rulesError(rules: CollectionRules): string | null {
  if (rules.conditions.length === 0) return "Añade al menos una condición.";
  if (rules.conditions.length > MAX_CONDITIONS) return `Máximo ${MAX_CONDITIONS} condiciones.`;
  if (rules.conditions.some((c) => !isValidCondition(c))) return "Completa el valor de todas las condiciones.";
  return null;
}

function opsFor(field: RuleField): RuleOp[] {
  return RULE_FIELDS.find((f) => f.value === field)?.ops ?? ["eq"];
}

function ConditionRow({ c, index, onChange, onRemove, readOnly, canRemove }: { c: RuleCondition; index: number; onChange: (c: RuleCondition) => void; onRemove: () => void; readOnly?: boolean; canRemove: boolean }) {
  const ops = opsFor(c.field);
  const valid = isValidCondition(c);
  return (
    <li className="grid gap-3 rounded-md border border-border bg-surface-2/40 p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      <Select
        label={`Campo ${index + 1}`}
        value={c.field}
        disabled={readOnly}
        onChange={(e) => {
          const field = e.target.value as RuleField;
          onChange({ field, op: opsFor(field).includes(c.op) ? c.op : "eq", value: field === "price" ? 0 : "" });
        }}
      >
        {RULE_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>
      <Select label="Condición" value={c.op} disabled={readOnly} onChange={(e) => onChange({ ...c, op: e.target.value as RuleOp })}>
        {ops.map((o) => (
          <option key={o} value={o}>
            {OP_LABELS[o]}
          </option>
        ))}
      </Select>
      {c.field === "price" ? (
        <MoneyInput label="Valor" value={typeof c.value === "number" ? c.value : c.value === "" ? null : Number(c.value)} disabled={readOnly} error={!valid ? "Indica un monto." : null} onChange={(v) => onChange({ ...c, value: v ?? ("" as string) })} />
      ) : (
        <Input label="Valor" value={String(c.value)} maxLength={255} disabled={readOnly} error={!valid ? "Obligatorio." : null} onChange={(e) => onChange({ ...c, value: e.target.value })} />
      )}
      {!readOnly ? <IconButton label={`Quitar condición ${index + 1}`} variant="secondary" disabled={!canRemove} icon={<Trash2 aria-hidden size={15} />} onClick={onRemove} /> : null}
    </li>
  );
}

export function RulesBuilder({ rules, onChange, readOnly }: { rules: CollectionRules; onChange: (r: CollectionRules) => void; readOnly?: boolean }) {
  const canPreview = useCan("collections:write");
  const err = rulesError(rules);
  const normalized = err ? null : normalizeRules(rules);
  const debounced = useDebounced(normalized ? JSON.stringify(normalized) : null, 500);

  const preview = useQuery<RulePreview, ApiError>({
    queryKey: ["collections", "preview", debounced],
    queryFn: ({ signal }) => collectionsApi.previewRules(JSON.parse(debounced as string) as CollectionRules, signal),
    enabled: !!debounced && canPreview,
    staleTime: 15_000,
  });

  const set = (i: number, c: RuleCondition) => onChange({ ...rules, conditions: rules.conditions.map((x, j) => (j === i ? c : x)) });
  const waiting = !!normalized && JSON.stringify(normalized) !== debounced;

  return (
    <>
      <Card title="Reglas" description="Los productos activos que cumplan las condiciones entran solos en la colección.">
        <div className="flex flex-col gap-4">
          <Select label="Un producto entra si cumple" value={rules.match} disabled={readOnly} onChange={(e) => onChange({ ...rules, match: e.target.value === "any" ? "any" : "all" })} wrapperClassName="max-w-xs">
            <option value="all">Todas las condiciones</option>
            <option value="any">Cualquiera de las condiciones</option>
          </Select>
          <ul className="flex flex-col gap-3" aria-label="Condiciones">
            {rules.conditions.map((c, i) => (
              <ConditionRow key={i} c={c} index={i} readOnly={readOnly} canRemove={rules.conditions.length > 1} onChange={(n) => set(i, n)} onRemove={() => onChange({ ...rules, conditions: rules.conditions.filter((_, j) => j !== i) })} />
            ))}
          </ul>
          {!readOnly ? (
            <div className="flex items-center gap-3">
              <Button size="sm" leftIcon={<Plus aria-hidden size={14} />} disabled={rules.conditions.length >= MAX_CONDITIONS} onClick={() => onChange({ ...rules, conditions: [...rules.conditions, { field: "tag", op: "eq", value: "" }] })}>
                Añadir condición
              </Button>
              <span className="text-xs text-muted">
                {rules.conditions.length}/{MAX_CONDITIONS}
              </span>
            </div>
          ) : null}
          {err && rules.conditions.length === 0 ? (
            <p role="alert" className="text-xs text-danger">
              {err}
            </p>
          ) : null}
        </div>
      </Card>

      <Card title="Vista previa en vivo" description="Productos activos que cumplen las reglas actuales.">
        {!canPreview ? (
          <p className="text-sm text-muted">Necesitas el permiso collections:write para previsualizar.</p>
        ) : err ? (
          <p className="text-sm text-muted">{err}</p>
        ) : preview.isLoading || waiting ? (
          <div className="flex flex-col gap-2" aria-busy>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : preview.error ? (
          <ErrorState error={preview.error} onRetry={() => preview.refetch()} />
        ) : preview.data ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="text-sm">
              <strong>{formatNumber(preview.data.total)}</strong> producto{preview.data.total === 1 ? "" : "s"} coincide{preview.data.total === 1 ? "" : "n"}
              {preview.data.total > preview.data.products.length ? ` (mostrando ${preview.data.products.length})` : ""}.
            </p>
            {preview.data.products.length === 0 ? (
              <EmptyState title="Ningún producto cumple estas reglas" className="py-6" />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {preview.data.products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <Thumb url={p.image?.url} alt={p.image?.alt} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block text-xs text-muted">{formatCop(p.price)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Card>
    </>
  );
}
