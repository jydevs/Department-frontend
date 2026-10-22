"use client";

import { useState } from "react";
import { Button, Card, TagInput, Textarea, useToast } from "@/components/admin/ui";
import { isConcurrentUpdate } from "@/lib/admin/errors";
import { orderErrorMessage, REFUND_PENDING_TAG, useUpdateOrder, type OrderDetail } from "@/lib/admin/api/orders";
import { useCan } from "@/lib/admin/permissions";
import { Notice } from "./notice";

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

/** Nota interna del pedido (PATCH con `version`). */
export function InternalNoteCard({ order }: { order: OrderDetail }) {
  const canWrite = useCan("orders:write");
  const toast = useToast();
  const update = useUpdateOrder(order.id);
  const [draft, setDraft] = useState(order.internalNote ?? "");
  const [error, setError] = useState<string | null>(null);
  // si el servidor cambia el valor y el usuario no había editado, adoptamos el nuevo
  const [prev, setPrev] = useState(order.internalNote ?? "");
  if (prev !== (order.internalNote ?? "")) {
    if (draft === prev) setDraft(order.internalNote ?? "");
    setPrev(order.internalNote ?? "");
  }
  const dirty = draft !== (order.internalNote ?? "");

  const save = () => {
    setError(null);
    update.mutate(
      { version: order.version, internalNote: draft.trim() ? draft : null },
      {
        onSuccess: () => toast.success("Nota interna guardada"),
        onError: (err) => {
          setError(orderErrorMessage(err));
          if (isConcurrentUpdate(err)) toast.warning("El pedido cambió: ya cargamos la versión más reciente. Revisa y vuelve a guardar.");
        },
      },
    );
  };

  return (
    <Card title="Nota interna" description="Solo la ve el equipo.">
      {canWrite ? (
        <div className="space-y-3">
          <Textarea aria-label="Nota interna" rows={4} maxLength={5000} value={draft} onChange={(e) => setDraft(e.target.value)} error={error} placeholder="Instrucciones de empaque, acuerdos con el cliente…" />
          <div className="flex justify-end gap-2">
            {dirty ? (
              <Button size="sm" variant="ghost" onClick={() => setDraft(order.internalNote ?? "")} disabled={update.isPending}>
                Descartar
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" disabled={!dirty} loading={update.isPending} onClick={save}>
              Guardar nota
            </Button>
          </div>
        </div>
      ) : order.internalNote ? (
        <p className="text-sm whitespace-pre-wrap">{order.internalNote}</p>
      ) : (
        <p className="text-sm text-muted">Sin nota interna.</p>
      )}
    </Card>
  );
}

/** Etiquetas editables. `refund-pending` lo gestiona el servidor, pero se puede quitar a mano. */
export function TagsCard({ order }: { order: OrderDetail }) {
  const canWrite = useCan("orders:write");
  const toast = useToast();
  const update = useUpdateOrder(order.id);
  const [draft, setDraft] = useState<string[]>(order.tags);
  const [error, setError] = useState<string | null>(null);
  const [prev, setPrev] = useState(order.tags);
  if (!sameTags(prev, order.tags)) {
    if (sameTags(draft, prev)) setDraft(order.tags);
    setPrev(order.tags);
  }
  const dirty = !sameTags(draft, order.tags);
  const hadRefundTag = order.tags.includes(REFUND_PENDING_TAG);

  const save = () => {
    setError(null);
    update.mutate(
      { version: order.version, tags: draft },
      {
        onSuccess: () => toast.success("Etiquetas guardadas"),
        onError: (err) => {
          setError(orderErrorMessage(err));
          if (isConcurrentUpdate(err)) toast.warning("El pedido cambió: ya cargamos la versión más reciente. Revisa y vuelve a guardar.");
        },
      },
    );
  };

  return (
    <Card title="Etiquetas">
      {canWrite ? (
        <div className="space-y-3">
          <TagInput label="Etiquetas del pedido" value={draft} onChange={setDraft} maxLength={50} suggestions={["vip", "regalo", "revisar", "mayorista"]} error={error} />
          {hadRefundTag && !draft.includes(REFUND_PENDING_TAG) ? (
            <Notice tone="warning">Quitar «{REFUND_PENDING_TAG}» no registra ningún reembolso. Hazlo solo si ya devolviste el dinero fuera del panel.</Notice>
          ) : null}
          <div className="flex justify-end gap-2">
            {dirty ? (
              <Button size="sm" variant="ghost" onClick={() => setDraft(order.tags)} disabled={update.isPending}>
                Descartar
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" disabled={!dirty} loading={update.isPending} onClick={save}>
              Guardar etiquetas
            </Button>
          </div>
        </div>
      ) : order.tags.length ? (
        <p className="text-sm">{order.tags.join(", ")}</p>
      ) : (
        <p className="text-sm text-muted">Sin etiquetas.</p>
      )}
    </Card>
  );
}
