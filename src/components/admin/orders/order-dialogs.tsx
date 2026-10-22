"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Banknote, PackageCheck, XCircle } from "lucide-react";
import { Button, Checkbox, Dialog, Input, Money, MoneyInput, Select, Textarea, useConfirm, useToast } from "@/components/admin/ui";
import { ApiError } from "@/lib/admin/errors";
import { formatCop } from "@/lib/admin/format";
import {
  orderErrorMessage,
  useCancelOrder,
  useCreateFulfillment,
  useCreateRefund,
  useMarkPaid,
  useUpdateOrder,
  type Address,
  type OrderDetail,
} from "@/lib/admin/api/orders";
import { Notice } from "./notice";
import { isPaid, lineName, refundableAmount, refundableUnits, shippableUnits } from "./order-utils";

interface DialogBaseProps {
  order: OrderDetail;
  onClose: () => void;
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <Notice tone="danger" className="mb-1">
      {message}
    </Notice>
  ) : null;
}

/* ------------------------------------------------------------------ */
/* Marcar como pagado                                                  */
/* ------------------------------------------------------------------ */

export function MarkPaidDialog({ order, onClose }: DialogBaseProps) {
  const toast = useToast();
  const mutation = useMarkPaid(order.id);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(
      { reference: reference.trim() || undefined, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Pedido #${order.orderNumber} marcado como pagado`);
          onClose();
        },
        onError: (err) => setError(orderErrorMessage(err, "Tu rol no puede marcar pedidos como pagados (requiere el permiso orders:payments).")),
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      title="Marcar como pagado"
      description={`Registra el pago manual del pedido #${order.orderNumber} (${formatCop(order.total)}).`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="mark-paid-form" loading={mutation.isPending} leftIcon={<Banknote aria-hidden size={15} />}>
            Marcar como pagado
          </Button>
        </>
      }
    >
      <form id="mark-paid-form" onSubmit={submit} className="space-y-4">
        <Notice tone="info">Se confirmará el stock reservado, el pedido pasará a abierto y se enviará al cliente la confirmación del pedido. Úsalo solo si recibiste el dinero por otro medio (transferencia, efectivo…).</Notice>
        <FormError message={error} />
        <Input label="Referencia del pago (opcional)" hint="Número de transferencia, recibo, etc." maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
        <Textarea label="Nota (opcional)" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} hint="Se guarda en la línea de tiempo." />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Cancelar pedido                                                     */
/* ------------------------------------------------------------------ */

export function CancelOrderDialog({ order, onClose }: DialogBaseProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const mutation = useCancelOrder(order.id);
  const paid = isPaid(order);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(paid);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setFieldError("Indica el motivo de la cancelación");
      return;
    }
    setFieldError(null);
    const ok = await confirm({
      title: `¿Cancelar el pedido #${order.orderNumber}?`,
      description: paid ? "El cliente recibirá un correo de cancelación y el pedido quedará marcado con «Reembolso pendiente» hasta que registres el reembolso." : "Se liberará el stock reservado y se notificará al cliente.",
      confirmLabel: "Cancelar pedido",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!ok) return;
    mutation.mutate(
      { reason: reason.trim(), restock: paid && restock },
      {
        onSuccess: () => {
          toast.success(`Pedido #${order.orderNumber} cancelado`);
          onClose();
        },
        onError: (err) => setError(orderErrorMessage(err)),
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      title="Cancelar pedido"
      description={`Pedido #${order.orderNumber} · ${formatCop(order.total)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Volver
          </Button>
          <Button variant="danger" type="submit" form="cancel-order-form" loading={mutation.isPending} leftIcon={<XCircle aria-hidden size={15} />}>
            Cancelar pedido
          </Button>
        </>
      }
    >
      <form id="cancel-order-form" onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <FormError message={error} />
        {paid ? (
          <Notice tone="warning" title="El pedido ya está pagado">
            Al cancelarlo quedará con la etiqueta «Reembolso pendiente»: después deberás registrar el reembolso aquí y devolver el dinero manualmente en el panel de Wompi.
          </Notice>
        ) : (
          <Notice tone="info">El pedido sigue pendiente de pago: se liberará el stock reservado automáticamente.</Notice>
        )}
        <Textarea label="Motivo de la cancelación" required rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} error={fieldError} hint="Se muestra al cliente en el correo y queda en la línea de tiempo." />
        {paid ? <Checkbox label="Reponer los productos al inventario" hint="Desmarca si la mercancía no volverá a estar disponible (dañada, ya entregada…)." checked={restock} onChange={(e) => setRestock(e.target.checked)} /> : null}
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Crear envío                                                         */
/* ------------------------------------------------------------------ */

const CARRIERS = ["Servientrega", "Coordinadora", "Interrapidísimo", "Envía", "TCC", "Deprisa", "Rappi / mensajería local"];

function QuantityInput({ label, value, max, onChange, disabled }: { label: string; value: number; max: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={0}
      max={max}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const n = Math.floor(Number(e.target.value));
        onChange(Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0);
      }}
      className="h-9 w-20 rounded-md border border-border-strong bg-surface px-2 text-center text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] disabled:opacity-50"
    />
  );
}

export function FulfillmentDialog({ order, onClose }: DialogBaseProps) {
  const toast = useToast();
  const mutation = useCreateFulfillment(order.id);
  const lines = useMemo(() => order.lines.filter((l) => shippableUnits(l) > 0), [order.lines]);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(lines.map((l) => [l.id, shippableUnits(l)])));
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selected = lines.filter((l) => (qty[l.id] ?? 0) > 0);
  const totalUnits = selected.reduce((s, l) => s + (qty[l.id] ?? 0), 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (selected.length === 0) next.lines = "Selecciona al menos una unidad para enviar";
    const url = trackingUrl.trim();
    if (url) {
      let valid = false;
      try {
        valid = new URL(url).protocol === "https:";
      } catch {
        valid = false;
      }
      if (!valid) next.trackingUrl = "Debe ser una URL válida que empiece por https://";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate(
      {
        lines: selected.map((l) => ({ orderLineId: l.id, quantity: qty[l.id] })),
        carrier: carrier.trim() || undefined,
        trackingNumber: tracking.trim() || undefined,
        trackingUrl: url || undefined,
        notifyCustomer: notify,
      },
      {
        onSuccess: (res) => {
          toast.success(res.order.fulfillmentStatus === "fulfilled" ? "Envío creado: el pedido quedó completado" : "Envío parcial creado");
          onClose();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
            const fe = err.fieldErrors();
            setErrors({ trackingUrl: fe.trackingUrl ?? "", carrier: fe.carrier ?? "", trackingNumber: fe.trackingNumber ?? "" });
          }
          setError(orderErrorMessage(err));
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      size="lg"
      title="Crear envío"
      description={`Pedido #${order.orderNumber}. Elige qué unidades salen en este envío.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="fulfillment-form" loading={mutation.isPending} leftIcon={<PackageCheck aria-hidden size={15} />}>
            Crear envío{totalUnits > 0 ? ` (${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"})` : ""}
          </Button>
        </>
      }
    >
      <form id="fulfillment-form" onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <fieldset className="space-y-2">
          <legend className="mb-1 text-[13px] font-medium">Líneas del envío</legend>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{lineName(l)}</p>
                  <p className="text-xs text-muted">
                    Pendientes: {shippableUnits(l)} de {l.quantity}
                    {l.sku ? ` · SKU ${l.sku}` : ""}
                  </p>
                </div>
                <QuantityInput label={`Unidades a enviar de ${lineName(l)}`} value={qty[l.id] ?? 0} max={shippableUnits(l)} onChange={(n) => setQty((q) => ({ ...q, [l.id]: n }))} />
              </li>
            ))}
          </ul>
          {errors.lines ? (
            <p role="alert" className="text-xs text-danger">
              {errors.lines}
            </p>
          ) : null}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Transportadora" list="carriers-list" maxLength={80} value={carrier} onChange={(e) => setCarrier(e.target.value)} error={errors.carrier || undefined} placeholder="Servientrega…" />
          <datalist id="carriers-list">
            {CARRIERS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Input label="Número de guía" maxLength={120} value={tracking} onChange={(e) => setTracking(e.target.value)} error={errors.trackingNumber || undefined} />
          <Input
            label="URL de seguimiento"
            wrapperClassName="sm:col-span-2"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://…"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            error={errors.trackingUrl || undefined}
            hint="Opcional. Solo enlaces https."
          />
        </div>
        <Checkbox label="Notificar al cliente por correo" hint="Le enviamos el aviso de envío con la guía y el enlace de seguimiento." checked={notify} onChange={(e) => setNotify(e.target.checked)} />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Reembolso                                                           */
/* ------------------------------------------------------------------ */

export function RefundDialog({ order, onClose }: DialogBaseProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const mutation = useCreateRefund(order.id);
  const max = refundableAmount(order);
  const lines = useMemo(() => order.lines.filter((l) => refundableUnits(l) > 0), [order.lines]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<number | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // paidAt solo existe si la reserva llegó a descontarse del inventario; un pedido que venció o se canceló sin pagarse
  // nunca comprometió stock y la API rechaza reponerlo (RESTOCK_NOT_APPLICABLE)
  const restockApplicable = order.paidAt !== null;

  const returned = lines.filter((l) => (qty[l.id] ?? 0) > 0);
  const suggested = Math.min(max, returned.reduce((s, l) => s + l.unitPrice * (qty[l.id] ?? 0), 0));

  const setLineQty = (id: string, n: number) => {
    const next = { ...qty, [id]: n };
    setQty(next);
    if (!amountTouched) {
      const sum = lines.reduce((s, l) => s + l.unitPrice * (next[l.id] ?? 0), 0);
      setAmount(sum > 0 ? Math.min(max, sum) : null);
    }
    if (!lines.some((l) => (next[l.id] ?? 0) > 0)) setRestock(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (!amount || amount < 1) next.amount = "Indica el monto a reembolsar";
    else if (amount > max) next.amount = `No puede superar ${formatCop(max)}`;
    if (restock && returned.length === 0) next.restock = "Indica las unidades devueltas para reponer el inventario";
    setErrors(next);
    if (Object.keys(next).length || !amount) return;
    const ok = await confirm({
      title: `¿Registrar reembolso de ${formatCop(amount)}?`,
      description: "Se enviará un correo al cliente. Recuerda que este registro NO devuelve el dinero: la devolución real debes hacerla manualmente en el panel de Wompi.",
      confirmLabel: "Registrar reembolso",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!ok) return;
    mutation.mutate(
      {
        amount,
        reason: reason.trim() || undefined,
        lines: returned.length ? returned.map((l) => ({ orderLineId: l.id, quantity: qty[l.id] })) : undefined,
        restock: restockApplicable && restock,
      },
      {
        onSuccess: (res) => {
          toast.success(res.order.paymentStatus === "refunded" ? "Reembolso total registrado" : "Reembolso parcial registrado");
          onClose();
        },
        onError: (err) => setError(orderErrorMessage(err, "Tu rol no puede registrar reembolsos (requiere el permiso orders:refunds).")),
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      size="lg"
      title="Registrar reembolso"
      description={`Pedido #${order.orderNumber} · pagado ${formatCop(order.total)} · ya reembolsado ${formatCop(order.totalRefunded)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="refund-form" loading={mutation.isPending}>
            Registrar reembolso{amount ? ` de ${formatCop(amount)}` : ""}
          </Button>
        </>
      }
    >
      <form id="refund-form" onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
        <FormError message={error} />
        <Notice tone="warning" title="El dinero se devuelve a mano">
          Este registro actualiza el pedido y avisa al cliente, pero no mueve dinero. Debes hacer el reembolso real manualmente desde el panel de Wompi.
        </Notice>

        {lines.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-[13px] font-medium">Unidades devueltas (opcional)</legend>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lineName(l)}</p>
                    <p className="text-xs text-muted">
                      <Money value={l.unitPrice} /> c/u · reembolsables: {refundableUnits(l)} de {l.quantity}
                    </p>
                  </div>
                  <QuantityInput label={`Unidades devueltas de ${lineName(l)}`} value={qty[l.id] ?? 0} max={refundableUnits(l)} onChange={(n) => setLineQty(l.id, n)} />
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <MoneyInput
              label="Monto a reembolsar"
              required
              value={amount}
              max={max}
              onChange={(v) => {
                setAmount(v);
                setAmountTouched(true);
              }}
              error={errors.amount}
              hint={`Máximo ${formatCop(max)} (pagado − reembolsado). Incluye envío o impuestos si aplica.`}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAmount(max);
                  setAmountTouched(true);
                }}
              >
                Todo lo pendiente
              </Button>
              {suggested > 0 && suggested !== amount ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAmount(suggested);
                    setAmountTouched(false);
                  }}
                >
                  Valor de las unidades ({formatCop(suggested)})
                </Button>
              ) : null}
            </div>
          </div>
          <Input label="Motivo (opcional)" maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Producto defectuoso, talla incorrecta…" />
        </div>

        <Checkbox
          label="Reponer las unidades devueltas al inventario"
          hint={
            errors.restock
              ? undefined
              : !restockApplicable
                ? "No aplica: este pedido nunca descontó inventario (no llegó a pagarse)."
                : returned.length
                  ? `Se repondrán ${returned.reduce((s, l) => s + (qty[l.id] ?? 0), 0)} unidades.`
                  : "Selecciona primero las unidades devueltas."
          }
          error={errors.restock}
          disabled={!restockApplicable || returned.length === 0}
          checked={restockApplicable && restock}
          onChange={(e) => setRestock(e.target.checked)}
        />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Editar contacto y dirección de envío                                */
/* ------------------------------------------------------------------ */

const PHONE_RE = /^\+?[0-9]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AddressDraft = Record<keyof Address, string>;

export function EditContactDialog({ order, onClose }: DialogBaseProps) {
  const toast = useToast();
  const mutation = useUpdateOrder(order.id);
  const a = order.shippingAddress;
  const [email, setEmail] = useState(order.email);
  const [phone, setPhone] = useState(order.phone ?? "");
  const [addr, setAddr] = useState<AddressDraft>({
    fullName: a.fullName ?? "",
    phone: a.phone ?? "",
    department: a.department ?? "",
    city: a.city ?? "",
    address1: a.address1 ?? "",
    address2: a.address2 ?? "",
    postalCode: a.postalCode ?? "",
    documentType: a.documentType ?? "",
    documentNumber: a.documentNumber ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Address) => (v: string) => setAddr((p) => ({ ...p, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) next.email = "Correo no válido";
    if (phone.trim() && !PHONE_RE.test(phone.trim())) next.phone = "Teléfono no válido (7 a 20 dígitos, puede empezar por +)";
    if (addr.fullName.trim().length < 2) next["shippingAddress.fullName"] = "Mínimo 2 caracteres";
    if (!PHONE_RE.test(addr.phone.trim())) next["shippingAddress.phone"] = "Teléfono no válido (7 a 20 dígitos)";
    if (addr.department.trim().length < 2) next["shippingAddress.department"] = "Indica el departamento";
    if (addr.city.trim().length < 2) next["shippingAddress.city"] = "Indica la ciudad";
    if (addr.address1.trim().length < 5) next["shippingAddress.address1"] = "Mínimo 5 caracteres";
    if (addr.documentNumber.trim() && addr.documentNumber.trim().length < 4) next["shippingAddress.documentNumber"] = "Mínimo 4 caracteres";
    if (addr.documentNumber.trim() && !addr.documentType) next["shippingAddress.documentType"] = "Elige el tipo de documento";
    setErrors(next);
    if (Object.keys(next).length) return;

    const shippingAddress: Address = {
      fullName: addr.fullName.trim(),
      phone: addr.phone.trim(),
      department: addr.department.trim(),
      city: addr.city.trim(),
      address1: addr.address1.trim(),
      ...(addr.address2.trim() ? { address2: addr.address2.trim() } : {}),
      ...(addr.postalCode.trim() ? { postalCode: addr.postalCode.trim() } : {}),
      ...(addr.documentType ? { documentType: addr.documentType as NonNullable<Address["documentType"]> } : {}),
      ...(addr.documentNumber.trim() ? { documentNumber: addr.documentNumber.trim() } : {}),
    };
    mutation.mutate(
      { version: order.version, email: trimmedEmail, phone: phone.trim() || null, shippingAddress },
      {
        onSuccess: () => {
          toast.success("Contacto y dirección actualizados");
          onClose();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(err.fieldErrors());
          setError(orderErrorMessage(err));
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      size="lg"
      title="Editar contacto y dirección de envío"
      description="Solo se puede editar mientras el pedido no tenga envíos."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="contact-form" loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Correo del cliente" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <Input label="Teléfono de contacto" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} hint="Opcional" />
        </div>
        <h3 className="pt-1 text-sm">Dirección de envío</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre completo" required value={addr.fullName} onChange={(e) => set("fullName")(e.target.value)} error={errors["shippingAddress.fullName"]} maxLength={120} />
          <Input label="Teléfono" type="tel" required value={addr.phone} onChange={(e) => set("phone")(e.target.value)} error={errors["shippingAddress.phone"]} />
          <Input label="Departamento" required value={addr.department} onChange={(e) => set("department")(e.target.value)} error={errors["shippingAddress.department"]} maxLength={60} />
          <Input label="Ciudad" required value={addr.city} onChange={(e) => set("city")(e.target.value)} error={errors["shippingAddress.city"]} maxLength={80} />
          <Input label="Dirección" required wrapperClassName="sm:col-span-2" value={addr.address1} onChange={(e) => set("address1")(e.target.value)} error={errors["shippingAddress.address1"]} maxLength={200} />
          <Input label="Complemento (apto, torre…)" value={addr.address2} onChange={(e) => set("address2")(e.target.value)} error={errors["shippingAddress.address2"]} maxLength={200} />
          <Input label="Código postal" value={addr.postalCode} onChange={(e) => set("postalCode")(e.target.value)} error={errors["shippingAddress.postalCode"]} maxLength={12} />
          <Select label="Tipo de documento" value={addr.documentType} onChange={(e) => set("documentType")(e.target.value)} error={errors["shippingAddress.documentType"]}>
            <option value="">Sin documento</option>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="NIT">NIT</option>
            <option value="PP">Pasaporte</option>
          </Select>
          <Input label="Número de documento" value={addr.documentNumber} onChange={(e) => set("documentNumber")(e.target.value)} error={errors["shippingAddress.documentNumber"]} maxLength={20} />
        </div>
      </form>
    </Dialog>
  );
}
