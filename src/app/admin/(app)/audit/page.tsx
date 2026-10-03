"use client";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/admin/ui/Display";
import { Input, Select } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { DiffTable } from "@/components/admin/content/PublishBar";
import { diffJson } from "@/lib/admin/api/content";
import { fetchAudit, type AuditFilters } from "@/lib/admin/api/admin";
import type { AuditEntry, JsonValue } from "@/lib/admin/types";

/** Lista por cursor: cada "Cargar más" pide la página siguiente y las acumula. */
function Pages({ f, onSel }: { f: AuditFilters; onSel: (a: AuditEntry) => void }) {
  const [cursors, setCursors] = useState<number[]>([0]);
  const results = useQueries({ queries: cursors.map((c) => ({ queryKey: ["audit", f, c], queryFn: () => fetchAudit(f, c) })) });
  const items = results.flatMap((r) => r.data?.items ?? []);
  const last = results[results.length - 1]?.data;
  return (
    <>
      <DataTable caption="Registro de auditoría" loading={results[0]?.isLoading} rows={items} rowKey={(a) => a.id} onRowClick={onSel}
        columns={[{ key: "d", header: "Fecha", cell: (a) => <DateTime value={a.at} /> }, { key: "u", header: "Usuario", cell: (a) => a.actor }, { key: "a", header: "Acción", cell: (a) => <Badge tone="info">{a.action}</Badge> }, { key: "e", header: "Entidad", cell: (a) => `${a.entity} · ${a.entityId}` }, { key: "i", header: "IP", cell: (a) => <code className="text-xs">{a.ip}</code> }]} />
      {last?.nextCursor != null && <div className="mt-3 text-center"><Button loading={results[results.length - 1]?.isFetching} onClick={() => setCursors((l) => [...l, last.nextCursor as number])}>Cargar más</Button></div>}
    </>
  );
}

export default function AuditPage() {
  const [f, setF] = useState<AuditFilters>({ actor: "", action: "", entity: "" });
  const [sel, setSel] = useState<AuditEntry | null>(null);
  return (
    <>
      <PageHeader title="Auditoría" />
      <div className="mb-3 grid gap-2 sm:grid-cols-3"><Input aria-label="Usuario" placeholder="Usuario" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })} /><Input aria-label="Acción" placeholder="Acción (ej. product)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
        <Select aria-label="Entidad" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}><option value="">Todas las entidades</option>{["product", "order", "template", "variant", "staff", "discount", "customer"].map((x) => <option key={x}>{x}</option>)}</Select></div>
      <Pages key={JSON.stringify(f)} f={f} onSel={setSel} />
      <Dialog open={!!sel} onClose={() => setSel(null)} title={sel?.action ?? ""} size="lg">
        {sel && <div className="space-y-3 text-sm"><p className="text-muted">{sel.actor} · <DateTime value={sel.at} /> · {sel.ip}</p><DiffTable rows={diffJson((sel.before ?? {}) as JsonValue, (sel.after ?? {}) as JsonValue)} /></div>}
      </Dialog>
    </>
  );
}
