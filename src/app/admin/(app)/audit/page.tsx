"use client";
import { useState } from "react";
import { Button } from "@/components/admin/ui/Button";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Badge, DateTime, PageHeader } from "@/components/admin/ui/Display";
import { Select } from "@/components/admin/ui/Form";
import { Dialog } from "@/components/admin/ui/Overlay";
import { DiffTable } from "@/components/admin/content/PublishBar";
import { diffJson } from "@/lib/admin/api/content";
import { useAuditLog, useStaff, type AuditFilters } from "@/lib/admin/api/admin";
import { errorMessage } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import type { AuditEntry, JsonValue } from "@/lib/admin/types";

/** Tipos de entidad que registra el backend. */
const ENTITIES = ["Product", "Variant", "Collection", "Order", "Customer", "Discount", "ShippingZone", "ShippingRate", "TaxSetting", "StaffUser", "ContentDocument", "Media", "Redirect", "InventoryLevel", "Location", "ImportJob", "email_template", "newsletter_subscriber", "contact_message", "Maintenance"];

export default function AuditPage() {
  const [f, setF] = useState<AuditFilters>({ actorId: "", entity: "" });
  const [sel, setSel] = useState<AuditEntry | null>(null);
  const canStaff = useCan("staff:read");
  const staff = useStaff();
  const q = useAuditLog(f);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const who = (a: { actorId: string | null; actorType: string }) => (a.actorId ? (canStaff ? staff.data?.find((s) => s.id === a.actorId)?.name : undefined) ?? `${a.actorId.slice(0, 8)}…` : a.actorType === "anonymous" ? "Anónimo / sistema" : a.actorType);
  return (
    <>
      <PageHeader title="Auditoría" />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <Select aria-label="Usuario" value={f.actorId} onChange={(e) => setF({ ...f, actorId: e.target.value })}><option value="">Todos los usuarios</option>{canStaff && staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select aria-label="Entidad" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })}><option value="">Todas las entidades</option>{ENTITIES.map((x) => <option key={x}>{x}</option>)}</Select></div>
      <DataTable caption="Registro de auditoría" loading={q.isLoading} rows={items} rowKey={(a) => a.id} onRowClick={setSel} error={q.error ? errorMessage(q.error) : undefined}
        columns={[{ key: "d", header: "Fecha", cell: (a) => <DateTime value={a.at} /> }, { key: "u", header: "Usuario", cell: (a) => who(a) }, { key: "a", header: "Acción", cell: (a) => <Badge tone="info">{a.action}</Badge> }, { key: "e", header: "Entidad", cell: (a) => `${a.entity} · ${a.entityId.slice(0, 13)}` }, { key: "i", header: "IP", cell: (a) => <code className="text-xs">{a.ip}</code> }]} />
      {q.hasNextPage && <div className="mt-3 text-center"><Button loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Cargar más</Button></div>}
      <Dialog open={!!sel} onClose={() => setSel(null)} title={sel?.action ?? ""} size="lg">
        {sel && <div className="space-y-3 text-sm"><p className="text-muted">{who(sel)} · <DateTime value={sel.at} /> · {sel.ip}{sel.requestId ? ` · req ${sel.requestId}` : ""}</p><p className="text-xs">Entidad: <code>{sel.entity}</code> · <code>{sel.entityId}</code></p>
          {sel.before || sel.after ? <DiffTable rows={diffJson((sel.before ?? {}) as JsonValue, (sel.after ?? {}) as JsonValue)} /> : <p className="text-muted">Sin detalle de cambios.</p>}</div>}
      </Dialog>
    </>
  );
}
