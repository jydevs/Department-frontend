"use client";

import { Link } from "@/lib/admin/navigation";
import { useState } from "react";
import { Banknote, Ban, ExternalLink, Mail, MapPin, PackageCheck, PackageX, Pencil, Phone, ReceiptText, Truck } from "lucide-react";
import { Badge, Button, Card, CopyButton, DateTime, EmptyState, ErrorState, LinkButton, Money, NoAccess, PageHeader, Skeleton, useConfirm, useToast } from "@/components/admin/ui";
import { ApiError } from "@/lib/admin/errors";
import { useCan } from "@/lib/admin/permissions";
import { formatNumber } from "@/lib/admin/format";
import { safeHref, STOREFRONT_URL } from "@/lib/admin/utils";
import { orderErrorMessage, REFUND_PENDING_TAG, useCancelFulfillment, useOrder, type Address, type Fulfillment, type OrderDetail, type OrderLine } from "@/lib/admin/api/orders";
import { FulfillmentBadge, OrderStatusBadge, OrderTag, PaymentBadge } from "./badges";
import { CancelOrderDialog, EditContactDialog, FulfillmentDialog, MarkPaidDialog, RefundDialog } from "./order-dialogs";
import { InternalNoteCard, TagsCard } from "./order-meta";
import { OrderTimeline } from "./order-timeline";
import { Notice } from "./notice";
import { canCancelOrder, canCreateFulfillment, canEditContact, canRefund, hasShipments, isPaid, lineName, refundableAmount } from "./order-utils";

type DialogKey = "markPaid" | "cancel" | "fulfill" | "refund" | "contact" | null;

function productImage(url: string | null): string | null {
  if (!url) return null;
  const href = url.startsWith("/") && !url.startsWith("//") ? `${STOREFRONT_URL}${url}` : url;
  return safeHref(href);
}

function LineThumb({ line }: { line: OrderLine }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : productImage(line.imageUrl);
  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- imágenes de la tienda en otro origen
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : null}
    </div>
  );
}

function AddressBlock({ address }: { address: Address }) {
  return (
    <address className="space-y-0.5 text-sm not-italic">
      <p className="font-medium">{address.fullName}</p>
      <p>{address.address1}</p>
      {address.address2 ? <p>{address.address2}</p> : null}
      <p>
        {address.city}, {address.department}
        {address.postalCode ? ` · ${address.postalCode}` : ""}
      </p>
      <p className="text-muted">{address.phone}</p>
      {address.documentType && address.documentNumber ? (
        <p className="text-muted">
          {address.documentType} {address.documentNumber}
        </p>
      ) : null}
    </address>
  );
}

function TotalsRow({ label, value, negative, strong, hint }: { label: string; value: number; negative?: boolean; strong?: boolean; hint?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 text-sm ${strong ? "border-t border-border pt-3 text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>
        {label}
        {hint ? <span className="ml-1.5 text-xs text-muted">{hint}</span> : null}
      </dt>
      <dd className="tabular-nums">
        {negative && value > 0 ? "−" : ""}
        <Money value={value} />
      </dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Cargando pedido" className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailView({ id }: { id: string }) {
  const canRead = useCan("orders:read");
  const canWrite = useCan("orders:write");
  const query = useOrder(id);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const close = () => setDialog(null);

  if (!canRead) return <NoAccess permission="orders:read" />;
  if (query.isLoading) return <LoadingState />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.code === "VALIDATION_ERROR")) {
    return (
      <EmptyState
        title="No encontramos este pedido"
        description="Puede que el enlace sea incorrecto o que el pedido ya no exista."
        action={
          <LinkButton href="/orders" variant="primary">
            Volver a pedidos
          </LinkButton>
        }
      />
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const order = query.data;
  const refundPending = order.tags.includes(REFUND_PENDING_TAG);
  const refundable = refundableAmount(order);
  const paid = isPaid(order);

  const actions = canWrite ? (
    <>
      {order.status === "pending" ? (
        <Button variant="primary" leftIcon={<Banknote aria-hidden size={15} />} onClick={() => setDialog("markPaid")}>
          Marcar como pagado
        </Button>
      ) : null}
      {canCreateFulfillment(order) ? (
        <Button variant="primary" leftIcon={<PackageCheck aria-hidden size={15} />} onClick={() => setDialog("fulfill")}>
          Crear envío
        </Button>
      ) : null}
      {canRefund(order) ? (
        <Button variant={refundPending ? "primary" : "secondary"} leftIcon={<ReceiptText aria-hidden size={15} />} onClick={() => setDialog("refund")}>
          Registrar reembolso
        </Button>
      ) : null}
      {canCancelOrder(order) ? (
        <Button variant="danger" leftIcon={<Ban aria-hidden size={15} />} onClick={() => setDialog("cancel")}>
          Cancelar pedido
        </Button>
      ) : order.status === "open" && hasShipments(order) ? (
        <Button variant="danger" disabled title="Tiene envíos: cancélalos primero o emite un reembolso" leftIcon={<Ban aria-hidden size={15} />}>
          Cancelar pedido
        </Button>
      ) : null}
    </>
  ) : null;

  const fulfilledUnits = order.lines.reduce((s, l) => s + l.fulfilledQuantity, 0);
  const totalUnits = order.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Pedidos", href: "/orders" }, { label: `#${order.orderNumber}` }]}
        title={`Pedido #${order.orderNumber}`}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <OrderStatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <FulfillmentBadge status={order.fulfillmentStatus} orderStatus={order.status} />
          </div>
        }
        description={
          <>
            Creado el <DateTime value={order.createdAt} />
            {order.paidAt ? (
              <>
                {" "}
                · pagado el <DateTime value={order.paidAt} />
              </>
            ) : null}
          </>
        }
        actions={actions}
      />

      {refundPending ? (
        <Notice
          tone="warning"
          title="Reembolso pendiente"
          className="mb-6"
          actions={
            canWrite && canRefund(order) ? (
              <Button size="sm" variant="primary" onClick={() => setDialog("refund")}>
                Registrar reembolso
              </Button>
            ) : undefined
          }
        >
          <p>
            Este pedido tiene dinero por devolver al cliente{refundable > 0 ? <> (hasta <Money value={refundable} className="font-semibold" />)</> : null}. Qué hacer:
          </p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-5">
            <li>Devuelve el dinero manualmente desde el panel de Wompi (la API no mueve dinero).</li>
            <li>Registra aquí el reembolso con el mismo monto. Si reembolsas el total, la etiqueta se quita sola.</li>
          </ol>
        </Notice>
      ) : null}

      {order.status === "cancelled" ? (
        <Notice tone="danger" className="mb-6" title="Pedido cancelado">
          {order.cancelledAt ? (
            <>
              Cancelado el <DateTime value={order.cancelledAt} />{order.cancelReason ? " · " : ""}
            </>
          ) : null}
          {order.cancelReason ? <>Motivo: {order.cancelReason}</> : null}
        </Notice>
      ) : null}
      {order.status === "expired" ? (
        <Notice tone="info" className="mb-6" title="Pedido caducado">
          No se recibió el pago a tiempo y el stock reservado se liberó.
        </Notice>
      ) : null}
      {order.status === "pending" && order.reservedUntil ? (
        <Notice tone="info" className="mb-6" title="Esperando el pago">
          El stock está reservado hasta <DateTime value={order.reservedUntil} />. Si no se paga, el pedido caducará solo.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Artículos */}
          <Card
            title="Artículos"
            description={`${formatNumber(totalUnits)} ${totalUnits === 1 ? "unidad" : "unidades"} · ${formatNumber(fulfilledUnits)} enviadas`}
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Artículos del pedido">
                <thead>
                  <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Producto
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Precio
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Cant.
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Enviadas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Reembolsadas
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="min-w-[220px] px-5 py-3">
                        <div className="flex items-center gap-3">
                          <LineThumb line={l} />
                          <div className="min-w-0">
                            <p className="font-medium">{lineName(l)}</p>
                            {l.sku ? <p className="text-xs text-muted">SKU {l.sku}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <Money value={l.unitPrice} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{l.quantity}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {l.fulfilledQuantity > 0 ? <span className={l.fulfilledQuantity >= l.quantity ? "text-success" : ""}>{l.fulfilledQuantity}</span> : <span className="text-muted">0</span>}
                        <span className="text-muted"> / {l.quantity}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{l.refundedQuantity > 0 ? <span className="text-warning">{l.refundedQuantity}</span> : <span className="text-muted">0</span>}</td>
                      <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                        <Money value={l.lineTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Totales */}
          <Card title="Resumen del pago">
            <dl className="max-w-md ml-auto">
              <TotalsRow label="Subtotal" value={order.subtotal} />
              {order.discountTotal > 0 ? <TotalsRow label="Descuento" hint={order.discountCode ?? undefined} value={order.discountTotal} negative /> : null}
              <TotalsRow label="Envío" hint={order.shippingRateName ?? undefined} value={order.shippingTotal} />
              <TotalsRow label="Impuestos (IVA)" value={order.taxTotal} />
              <TotalsRow label="Total" value={order.total} strong />
              {order.totalRefunded > 0 ? (
                <>
                  <TotalsRow label="Reembolsado" value={order.totalRefunded} negative />
                  <TotalsRow label="Neto cobrado" value={order.total - order.totalRefunded} strong />
                </>
              ) : null}
            </dl>
          </Card>

          {/* Envíos */}
          <Card title="Envíos" description={order.fulfillments.length ? undefined : "Aún no se ha enviado nada."}>
            {order.fulfillments.length === 0 ? (
              <p className="text-sm text-muted">
                {order.status === "open" && canWrite ? "Crea un envío para registrar la guía y avisar al cliente." : "Sin envíos registrados."}
              </p>
            ) : (
              <ul className="space-y-3">
                {order.fulfillments.map((f) => (
                  <FulfillmentItem key={f.id} order={order} fulfillment={f} canWrite={canWrite} />
                ))}
              </ul>
            )}
          </Card>

          {/* Pagos */}
          <Card title="Pagos" flush>
            {order.payments.length === 0 ? (
              <p className="p-5 text-sm text-muted">Aún no hay intentos de pago.</p>
            ) : (
              <ul className="divide-y divide-border">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 text-sm">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">
                        {p.provider === "manual" ? "Pago manual" : p.provider === "mock" ? "Pago de pruebas" : p.provider === "wompi" ? "Wompi" : p.provider}
                        {p.method ? <span className="font-normal text-muted"> · {p.method}</span> : null}
                      </p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        Ref. <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">{p.reference}</code>
                        <CopyButton value={p.reference} label="Copiar" className="h-6! px-2! text-xs!" />
                      </p>
                      {p.providerTransactionId ? <p className="text-xs text-muted">Transacción {p.providerTransactionId}</p> : null}
                      <p className="text-xs text-muted">
                        <DateTime value={p.createdAt} />
                        {p.rawStatus ? ` · ${p.rawStatus}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Money value={p.amount} className="font-medium" />
                      <div className="mt-1">
                        <PaymentLine status={p.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reembolsos */}
          {order.refunds.length > 0 ? (
            <Card title="Reembolsos" description="Registros de reembolso. El dinero real se devuelve a mano en Wompi." flush>
              <ul className="divide-y divide-border">
                {order.refunds.map((r) => (
                  <li key={r.id} className="px-5 py-3.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        <Money value={r.amount} /> {r.reason ? <span className="font-normal text-muted">· {r.reason}</span> : null}
                      </p>
                      <div className="flex items-center gap-2">
                        {r.restocked ? <Badge tone="info">Inventario repuesto</Badge> : null}
                        <Badge tone="neutral">Manual en Wompi</Badge>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      <DateTime value={r.createdAt} />
                    </p>
                    {r.lines.length > 0 ? (
                      <ul className="mt-1.5 list-disc pl-5 text-[13px] text-muted">
                        {r.lines.map((rl) => {
                          const line = order.lines.find((l) => l.id === rl.orderLineId);
                          return (
                            <li key={rl.id}>
                              {rl.quantity} × {line ? lineName(line) : "producto"}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <OrderTimeline orderId={order.id} />
        </div>

        {/* Columna lateral */}
        <div className="min-w-0 space-y-6">
          <Card
            title="Cliente"
            actions={
              canWrite && canEditContact(order) ? (
                <Button size="sm" variant="ghost" leftIcon={<Pencil aria-hidden size={13} />} onClick={() => setDialog("contact")}>
                  Editar
                </Button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <div className="space-y-1.5 text-sm">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p className="flex items-center gap-2 break-all">
                  <Mail aria-hidden size={14} className="shrink-0 text-muted" />
                  <a className="hover:underline" href={`mailto:${order.email}`}>
                    {order.email}
                  </a>
                </p>
                {order.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone aria-hidden size={14} className="shrink-0 text-muted" />
                    {order.phone}
                  </p>
                ) : null}
              </div>
              <div>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                  <MapPin aria-hidden size={13} /> Dirección de envío
                </h3>
                <AddressBlock address={order.shippingAddress} />
              </div>
              <div>
                <h3 className="mb-1.5 text-[13px] font-semibold text-muted">Dirección de facturación</h3>
                {order.billingAddress ? <AddressBlock address={order.billingAddress} /> : <p className="text-sm text-muted">Igual que la de envío.</p>}
              </div>
              {order.customerNote ? (
                <div>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-muted">Nota del cliente</h3>
                  <p className="rounded-md bg-surface-2 p-3 text-sm whitespace-pre-wrap">{order.customerNote}</p>
                </div>
              ) : null}
              {!canEditContact(order) && canWrite && order.status !== "cancelled" && order.status !== "expired" ? (
                <p className="text-xs text-muted">El contacto y la dirección ya no se pueden editar porque el pedido tiene envíos.</p>
              ) : null}
            </div>
          </Card>

          <InternalNoteCard order={order} />
          <TagsCard order={order} />

          <Card title="Detalles">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Pasarela</dt>
                <dd className="capitalize">{order.paymentProvider}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Referencia</dt>
                <dd className="min-w-0 truncate font-mono text-xs" title={order.paymentReference}>
                  {order.paymentReference}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tarifa de envío</dt>
                <dd>{order.shippingRateName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Descuento</dt>
                <dd>{order.discountCode ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Actualizado</dt>
                <dd>
                  <DateTime value={order.updatedAt} mode="relative" />
                </dd>
              </div>
              {order.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {order.tags.map((t) => (
                    <OrderTag key={t} tag={t} />
                  ))}
                </div>
              ) : null}
            </dl>
            {paid ? (
              <p className="mt-3 text-xs text-muted">
                <Link href={`/orders?q=${encodeURIComponent(order.email)}`} className="underline hover:text-text">
                  Ver más pedidos de este cliente
                </Link>
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      {dialog === "markPaid" ? <MarkPaidDialog order={order} onClose={close} /> : null}
      {dialog === "cancel" ? <CancelOrderDialog order={order} onClose={close} /> : null}
      {dialog === "fulfill" ? <FulfillmentDialog order={order} onClose={close} /> : null}
      {dialog === "refund" ? <RefundDialog order={order} onClose={close} /> : null}
      {dialog === "contact" ? <EditContactDialog order={order} onClose={close} /> : null}
    </>
  );
}

function PaymentLine({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    approved: { label: "Aprobado", tone: "success" },
    pending: { label: "Pendiente", tone: "warning" },
    declined: { label: "Rechazado", tone: "danger" },
    error: { label: "Error", tone: "danger" },
    voided: { label: "Anulado", tone: "neutral" },
  };
  const m = map[status];
  return (
    <Badge tone={m?.tone ?? "neutral"} dot>
      {m?.label ?? status}
    </Badge>
  );
}

function FulfillmentItem({ order, fulfillment: f, canWrite }: { order: OrderDetail; fulfillment: Fulfillment; canWrite: boolean }) {
  const confirm = useConfirm();
  const toast = useToast();
  const cancel = useCancelFulfillment(order.id);
  const href = safeHref(f.trackingUrl);
  const cancelled = f.status !== "success";
  const canCancel = canWrite && !cancelled && (order.status === "open" || order.status === "completed");

  const onCancel = async () => {
    const ok = await confirm({
      title: "¿Cancelar este envío?",
      description: "Las unidades volverán a quedar pendientes de envío. No se avisa al cliente automáticamente.",
      confirmLabel: "Cancelar envío",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!ok) return;
    cancel.mutate(f.id, {
      onSuccess: () => toast.success("Envío cancelado"),
      onError: (err) => toast.error(orderErrorMessage(err)),
    });
  };

  return (
    <li className={`rounded-lg border border-border p-4 ${cancelled ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Truck aria-hidden size={15} className="text-muted" />
            {f.carrier ?? "Sin transportadora"}
            {cancelled ? (
              <Badge tone="danger" dot>
                Cancelado
              </Badge>
            ) : (
              <Badge tone="success" dot>
                Enviado
              </Badge>
            )}
          </p>
          {f.trackingNumber ? (
            <p className="flex flex-wrap items-center gap-2 text-[13px]">
              Guía <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">{f.trackingNumber}</code>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                  Rastrear <ExternalLink aria-hidden size={12} />
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              ) : null}
            </p>
          ) : null}
          <p className="text-xs text-muted">
            <DateTime value={f.shippedAt} />
          </p>
        </div>
        {canCancel ? (
          <Button size="sm" variant="danger" loading={cancel.isPending} leftIcon={<PackageX aria-hidden size={13} />} onClick={() => void onCancel()}>
            Cancelar envío
          </Button>
        ) : null}
      </div>
      <ul className="mt-2.5 space-y-0.5 border-t border-border pt-2.5 text-[13px] text-muted">
        {f.lines.map((fl) => {
          const line = order.lines.find((l) => l.id === fl.orderLineId);
          return (
            <li key={fl.id}>
              {fl.quantity} × {line ? lineName(line) : "producto"}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
