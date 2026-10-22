"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscountBox } from "@/components/cart/DiscountBox";
import { Button } from "@/components/ui/Button";
import { canOptimize } from "@/lib/api/media";
import { refreshCart, useCart } from "@/lib/cart";
import type { ApiIssue, CheckoutResult, ShippingOption } from "@/lib/cart/types";
import { DEPARTMENTS, DOCUMENT_TYPES } from "@/lib/checkout/departments";
import { paymentDestination } from "@/lib/checkout/payment";
import {
  EMPTY_ADDRESS,
  EMPTY_FORM,
  FIELD_ORDER,
  checkoutPayload,
  fieldIdForPath,
  validateCheckout,
  type AddressForm,
  type CheckoutForm,
  type FormErrors,
} from "@/lib/checkout/validation";
import { clsx } from "@/lib/clsx";
import { formatCOP } from "@/lib/format";
import { Field } from "./Field";

const sectionTitle = "font-display text-display-md text-dept-white mb-5";

function AddressFields({
  prefix,
  value,
  onChange,
  errors,
  onDepartment,
}: {
  prefix: "s_" | "b_";
  value: AddressForm;
  onChange: (patch: Partial<AddressForm>) => void;
  errors: FormErrors;
  onDepartment?: (department: string) => void;
}) {
  const id = (k: keyof AddressForm) => `${prefix}${k}`;
  const ac = prefix === "s_" ? "shipping" : "billing";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id={id("fullName")} label="Nombre completo" required error={errors[id("fullName")]} className="sm:col-span-2">
        {(p) => <input {...p} type="text" autoComplete={`${ac} name`} value={value.fullName} onChange={(e) => onChange({ fullName: e.target.value })} data-testid={`checkout-${id("fullName")}`} />}
      </Field>
      <Field id={id("phone")} label="Teléfono de quien recibe" required error={errors[id("phone")]}>
        {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} data-testid={`checkout-${id("phone")}`} />}
      </Field>
      <Field id={id("department")} label="Departamento" required error={errors[id("department")]}>
        {(p) => (
          <select
            {...p}
            autoComplete={`${ac} address-level1`}
            value={value.department}
            onChange={(e) => {
              onChange({ department: e.target.value });
              onDepartment?.(e.target.value);
            }}
            data-testid={`checkout-${id("department")}`}
            className={clsx(p.className, "bg-dept-black")}
          >
            <option value="">Selecciona…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id={id("city")} label="Ciudad o municipio" required error={errors[id("city")]}>
        {(p) => <input {...p} type="text" autoComplete={`${ac} address-level2`} value={value.city} onChange={(e) => onChange({ city: e.target.value })} data-testid={`checkout-${id("city")}`} />}
      </Field>
      <Field id={id("address1")} label="Dirección" required error={errors[id("address1")]} className="sm:col-span-2">
        {(p) => <input {...p} type="text" autoComplete={`${ac} address-line1`} placeholder="Calle, carrera, número" value={value.address1} onChange={(e) => onChange({ address1: e.target.value })} data-testid={`checkout-${id("address1")}`} />}
      </Field>
      <Field id={id("address2")} label="Complemento" optionalHint error={errors[id("address2")]}>
        {(p) => <input {...p} type="text" autoComplete={`${ac} address-line2`} placeholder="Apartamento, torre, barrio" value={value.address2} onChange={(e) => onChange({ address2: e.target.value })} data-testid={`checkout-${id("address2")}`} />}
      </Field>
      <Field id={id("postalCode")} label="Código postal" optionalHint error={errors[id("postalCode")]}>
        {(p) => <input {...p} type="text" inputMode="numeric" autoComplete={`${ac} postal-code`} value={value.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })} data-testid={`checkout-${id("postalCode")}`} />}
      </Field>
      <Field id={id("documentType")} label="Tipo de documento" optionalHint error={errors[id("documentType")]}>
        {(p) => (
          <select {...p} value={value.documentType} onChange={(e) => onChange({ documentType: e.target.value })} data-testid={`checkout-${id("documentType")}`} className={clsx(p.className, "bg-dept-black")}>
            <option value="">Sin especificar</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id={id("documentNumber")} label="Número de documento" optionalHint error={errors[id("documentNumber")]}>
        {(p) => <input {...p} type="text" inputMode="text" autoComplete="off" value={value.documentNumber} onChange={(e) => onChange({ documentNumber: e.target.value })} data-testid={`checkout-${id("documentNumber")}`} />}
      </Field>
    </div>
  );
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function daysText(r: ShippingOption): string | null {
  if (r.minDays == null && r.maxDays == null) return null;
  const a = r.minDays ?? r.maxDays!;
  const b = r.maxDays ?? r.minDays!;
  return a === b ? `${a} ${a === 1 ? "día hábil" : "días hábiles"}` : `${a} a ${b} días hábiles`;
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, cart, ready, busy } = useCart();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [rates, setRates] = useState<ShippingOption[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const keyRef = useRef<{ key: string; signature: string } | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const set = useCallback((patch: Partial<CheckoutForm>) => setForm((f) => ({ ...f, ...patch })), []);
  const setShipping = useCallback((patch: Partial<AddressForm>) => setForm((f) => ({ ...f, shipping: { ...f.shipping, ...patch } })), []);
  const setBilling = useCallback((patch: Partial<AddressForm>) => setForm((f) => ({ ...f, billing: { ...f.billing, ...patch } })), []);

  // clears the error of a field as soon as the user edits it
  const clearError = useCallback((...ids: string[]) => setErrors((e) => (ids.some((i) => i in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !ids.includes(k))) : e)), []);

  /* optional prefill when the customer is signed in (the account area is built apart: ignore any failure) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/me", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        const c = (data.customer && typeof data.customer === "object" ? data.customer : data) as Record<string, unknown>;
        if (cancelled || typeof c.email !== "string") return;
        const name = [c.firstName, c.lastName].filter((x) => typeof x === "string" && x).join(" ") || (typeof c.fullName === "string" ? c.fullName : "");
        const phone = typeof c.phone === "string" ? c.phone : "";
        setForm((f) => ({
          ...f,
          email: f.email || (c.email as string),
          phone: f.phone || phone,
          shipping: { ...f.shipping, fullName: f.shipping.fullName || name, phone: f.shipping.phone || phone },
        }));
        const ar = await fetch("/api/account/addresses", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!ar.ok || cancelled) return;
        const list = (await ar.json()) as unknown;
        const arr = Array.isArray(list) ? list : Array.isArray((list as { items?: unknown })?.items) ? (list as { items: unknown[] }).items : [];
        const def = (arr.find((a) => (a as { isDefault?: boolean })?.isDefault) ?? arr[0]) as Record<string, string | null> | undefined;
        if (def && typeof def.department === "string" && (DEPARTMENTS as readonly string[]).includes(def.department)) {
          setForm((f) =>
            f.shipping.address1
              ? f
              : {
                  ...f,
                  shipping: {
                    ...f.shipping,
                    fullName: f.shipping.fullName || def.fullName || "",
                    phone: f.shipping.phone || def.phone || "",
                    department: def.department as string,
                    city: def.city ?? "",
                    address1: def.address1 ?? "",
                    address2: def.address2 ?? "",
                    postalCode: def.postalCode ?? "",
                    documentType: def.documentType ?? "",
                    documentNumber: def.documentNumber ?? "",
                  },
                },
          );
        }
      } catch {
        /* no session / no account area yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* shipping options for the chosen department; refreshed when the cart's price changes (free-shipping thresholds) */
  const department = form.shipping.department;
  useEffect(() => {
    if (!department || cart.lines.length === 0) return;
    let cancelled = false;
    (async () => {
      setRatesLoading(true);
      setRatesError(null);
      try {
        const res = await fetch(`/api/cart/shipping-rates?department=${encodeURIComponent(department)}`, { cache: "no-store" });
        const data = (await res.json()) as { rates?: ShippingOption[]; error?: ApiIssue };
        if (cancelled) return;
        if (!res.ok || !data.rates) {
          setRates([]);
          setRatesError(data.error?.message ?? "No pudimos consultar los envíos. Inténtalo de nuevo.");
        } else {
          setRates(data.rates);
          setForm((f) => {
            if (data.rates!.some((r) => r.id === f.shippingRateId)) return f;
            return { ...f, shippingRateId: data.rates!.length === 1 ? data.rates![0].id : "" };
          });
        }
      } catch {
        if (!cancelled) {
          setRates([]);
          setRatesError("No pudimos consultar los envíos. Revisa tu conexión.");
        }
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [department, cart.subtotal, cart.discountTotal, cart.discountCode, cart.lines.length]);

  const rate = rates?.find((r) => r.id === form.shippingRateId) ?? null;
  const shipping = rate ? rate.price : 0;
  const total = cart.subtotal - cart.discountTotal + shipping + (cart.taxIncluded ? 0 : cart.taxTotal);

  const focusFirst = (errs: FormErrors) => {
    const first = FIELD_ORDER.find((k) => errs[k]) ?? Object.keys(errs)[0];
    if (first) (document.getElementById(first) as HTMLElement | null)?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const errs = validateCheckout(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError(`Revisa ${Object.keys(errs).length === 1 ? "el campo marcado" : `los ${Object.keys(errs).length} campos marcados`} para continuar.`);
      focusFirst(errs);
      return;
    }
    if (cart.lines.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);

    // one Idempotency-Key per distinct body: a retry of the same data reuses it, edited data gets a new one
    const payload = checkoutPayload(form);
    const signature = JSON.stringify({ payload, cart: cart.cartId });
    if (!keyRef.current || keyRef.current.signature !== signature) keyRef.current = { key: newKey(), signature };

    let issue: ApiIssue | null = null;
    let result: CheckoutResult | null = null;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: keyRef.current.key }),
      });
      const data = (await res.json().catch(() => null)) as (CheckoutResult & { error?: ApiIssue }) | null;
      if (res.ok && data?.orderNumber) result = data;
      else issue = data?.error ?? { code: "HTTP", status: res.status, message: "No pudimos crear tu pedido. Inténtalo de nuevo." };
    } catch {
      issue = { code: "NETWORK", status: 0, message: "No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo; no se cobrará dos veces." };
    }

    if (result) {
      const dest = paymentDestination(result.payment, result.orderNumber);
      if (!dest) {
        setFormError("Tu pedido se creó, pero el pago no está disponible por ahora. Escríbenos con el número de pedido #" + result.orderNumber + ".");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      void refreshCart();
      if (dest.external) window.location.assign(dest.url);
      else router.push(dest.url);
      return; // stays "submitting" while the browser navigates
    }

    submittingRef.current = false;
    setSubmitting(false);
    if (issue) {
      if (issue.fields) {
        const mapped: FormErrors = {};
        for (const [path, msg] of Object.entries(issue.fields)) {
          const id = fieldIdForPath(path);
          if (id) mapped[id] = msg;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          focusFirst(mapped);
        }
      }
      if (["INSUFFICIENT_STOCK", "VARIANT_UNAVAILABLE", "CART_ALREADY_CONVERTED", "CART_EXPIRED", "CART_EMPTY"].includes(issue.code) || issue.details?.reset) {
        void refreshCart();
      }
      if (issue.code === "DISCOUNT_INVALID") void refreshCart();
      setFormError(issue.message);
      errorSummaryRef.current?.focus();
    }
  };

  /* ── states without a purchasable cart ── */

  if (!ready && items.length === 0) {
    return (
      <p role="status" data-testid="checkout-loading" className="font-condensed py-16 text-sm tracking-[0.12em] text-dept-gray-300">
        Cargando tu pedido…
      </p>
    );
  }
  if (ready && items.length === 0) {
    return (
      <div data-testid="checkout-empty" className="border border-white/15 p-8 text-center sm:p-12">
        <p className="font-display text-display-md">Tu carrito está vacío</p>
        <p className="mx-auto mt-3 max-w-[40ch] text-sm text-dept-white/60">Añade productos para poder finalizar tu compra.</p>
        <Button href="/collections/all" variant="red" size="lg" arrow className="mt-6">
          Seguir comprando
        </Button>
      </div>
    );
  }

  const blocked = items.some((i) => !i.available);
  const errorCount = Object.keys(errors).length;

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <form data-testid="checkout-form" onSubmit={submit} noValidate className="space-y-12 lg:col-span-7" aria-describedby={formError ? "checkout-form-error" : undefined}>
        <div
          ref={errorSummaryRef}
          id="checkout-form-error"
          tabIndex={-1}
          role="alert"
          data-testid="checkout-error"
          className={clsx("border border-dept-red bg-dept-red/10 p-4 font-condensed text-xs leading-relaxed tracking-[0.08em] text-dept-red-light outline-none", !formError && "hidden")}
        >
          {formError}
        </div>

        <fieldset className="min-w-0">
          <legend className={sectionTitle}>Contacto</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="email" label="Correo electrónico" required error={errors.email} hint="Aquí te enviamos la confirmación y el seguimiento.">
              {(p) => <input {...p} type="email" inputMode="email" autoComplete="email" placeholder="ejemplo@correo.com" value={form.email} onChange={(e) => { set({ email: e.target.value }); clearError("email"); }} data-testid="checkout-email" />}
            </Field>
            <Field id="phone" label="Teléfono de contacto" required error={errors.phone}>
              {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" value={form.phone} onChange={(e) => { set({ phone: e.target.value }); clearError("phone"); }} data-testid="checkout-phone" />}
            </Field>
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={sectionTitle}>Dirección de envío</legend>
          <AddressFields
            prefix="s_"
            value={form.shipping}
            errors={errors}
            onChange={(patch) => {
              setShipping(patch);
              clearError(...Object.keys(patch).map((k) => `s_${k}`));
            }}
            onDepartment={() => clearError("shippingRateId")}
          />
        </fieldset>

        <fieldset className="min-w-0" aria-describedby="shipping-help">
          <legend className={sectionTitle}>Método de envío</legend>
          <div id="shipping-help" aria-live="polite" data-testid="shipping-options">
            {!department ? (
              <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Elige el departamento de entrega para ver las opciones de envío.</p>
            ) : ratesLoading && !rates ? (
              <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Consultando envíos…</p>
            ) : ratesError ? (
              <p role="alert" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{ratesError}</p>
            ) : rates && rates.length === 0 ? (
              <p role="alert" data-testid="shipping-none" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">Por ahora no tenemos envíos a {department}. Escríbenos y buscamos una solución.</p>
            ) : (
              <div role="radiogroup" aria-label="Método de envío" aria-invalid={errors.shippingRateId ? true : undefined} className={clsx("space-y-2 transition-opacity", ratesLoading && "opacity-60")}>
                {rates?.map((r, i) => {
                  const days = daysText(r);
                  const checked = form.shippingRateId === r.id;
                  return (
                    <label key={r.id} className={clsx("flex cursor-pointer items-center gap-4 border p-4 transition-colors", checked ? "border-dept-white bg-white/5" : "border-white/20 hover:border-white/50")}>
                      <input
                        type="radio"
                        id={i === 0 ? "shippingRateId" : undefined}
                        name="shippingRate"
                        value={r.id}
                        checked={checked}
                        onChange={() => { set({ shippingRateId: r.id }); clearError("shippingRateId"); }}
                        data-testid="shipping-option"
                        className="size-4 accent-[var(--dept-red)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-condensed block text-sm tracking-[0.08em]">{r.name}</span>
                        {days && <span className="font-condensed block text-[11px] tracking-[0.1em] text-dept-gray-300">{days}</span>}
                      </span>
                      <span className="font-condensed shrink-0 text-sm tabular-nums">
                        {r.isFree ? (
                          <>
                            <span className="text-dept-white">Gratis</span>
                            {r.basePrice > 0 && <span className="ml-2 text-dept-gray-500 line-through">{formatCOP(r.basePrice)}</span>}
                          </>
                        ) : (
                          formatCOP(r.price)
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <p role="alert" data-testid="error-shippingRateId" className="font-condensed mt-2 text-xs text-dept-red-light">{errors.shippingRateId}</p>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={sectionTitle}>Facturación</legend>
          <label className="font-condensed flex cursor-pointer items-center gap-3 text-sm tracking-[0.08em]">
            <input type="checkbox" checked={form.billingSame} onChange={(e) => set({ billingSame: e.target.checked, ...(e.target.checked ? null : { billing: form.billing.fullName ? form.billing : { ...EMPTY_ADDRESS, ...form.shipping } }) })} data-testid="checkout-billing-same" className="size-4 accent-[var(--dept-red)]" />
            La dirección de facturación es la misma de envío
          </label>
          {!form.billingSame && (
            <div className="mt-6" data-testid="billing-fields">
              <AddressFields
                prefix="b_"
                value={form.billing}
                errors={errors}
                onChange={(patch) => {
                  setBilling(patch);
                  clearError(...Object.keys(patch).map((k) => `b_${k}`));
                }}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className={sectionTitle}>Nota del pedido</legend>
          <Field id="customerNote" label="¿Algo que debamos saber?" optionalHint error={errors.customerNote} hint={`${form.customerNote.length}/500`}>
            {(p) => <textarea {...p} rows={3} maxLength={500} value={form.customerNote} onChange={(e) => { set({ customerNote: e.target.value }); clearError("customerNote"); }} data-testid="checkout-note" />}
          </Field>
        </fieldset>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-dept-white/80">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => { set({ acceptTerms: e.target.checked }); clearError("acceptTerms"); }}
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby="error-acceptTerms"
              required
              data-testid="checkout-terms"
              className="mt-1 size-4 shrink-0 accent-[var(--dept-red)]"
            />
            <span>
              He leído y acepto los{" "}
              <Link href="/pages/terminos-y-condiciones" target="_blank" rel="noopener noreferrer" className="text-dept-white underline underline-offset-4">
                Términos y Condiciones<span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Link>{" "}
              y la{" "}
              <Link href="/pages/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-dept-white underline underline-offset-4">
                Política de Privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Link>
              . *
            </span>
          </label>
          <p id="error-acceptTerms" role="alert" data-testid="error-acceptTerms" className="font-condensed mt-2 text-xs text-dept-red-light">{errors.acceptTerms}</p>
        </div>

        <div>
          <Button type="submit" variant="red" size="lg" arrow disabled={submitting || blocked} aria-disabled={submitting || blocked} data-testid="checkout-submit" className="w-full">
            {submitting ? "Procesando…" : "Ir a pagar"}
          </Button>
          {errorCount > 0 && <p className="sr-only" aria-live="polite">{`Hay ${errorCount} campos por corregir.`}</p>}
          <p className="font-condensed mt-3 text-center text-[11px] tracking-[0.1em] text-dept-gray-500">Pagas de forma segura en la pasarela de pagos. No guardamos los datos de tu tarjeta.</p>
        </div>
      </form>

      <aside className="lg:col-span-5" aria-label="Resumen del pedido">
        <div data-testid="order-summary" className="border border-white/15 bg-white/[0.02] p-6 sm:p-8 lg:sticky lg:top-[calc(var(--chrome-h)+1.5rem)]" aria-busy={busy || ratesLoading}>
          <h2 className="font-display text-display-md mb-6 border-b border-white/10 pb-4 text-dept-white">Resumen del pedido</h2>

          <ul className="divide-y divide-white/10">
            {items.map((it) => (
              <li key={it.variantId} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 py-3" data-testid="summary-line">
                <span className="relative block aspect-[4/5] overflow-hidden bg-dept-gray-900">
                  {it.image && <Image src={it.image} unoptimized={!canOptimize(it.image)} alt="" fill sizes="56px" className="object-cover" />}
                  <span className="font-condensed absolute -right-0 -top-0 grid min-w-5 place-items-center bg-dept-black/80 px-1 text-[10px] tabular-nums">{it.qty}</span>
                </span>
                <span className="font-condensed min-w-0 text-xs tracking-[0.08em]">
                  <span className="block truncate">{it.name}</span>
                  {it.size && <span className="block text-dept-gray-500">Talla {it.size}</span>}
                  {!it.available && <span className="block text-dept-red-light">No disponible</span>}
                </span>
                <span className="font-condensed text-xs tabular-nums">{formatCOP(it.total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right">
            <Link href="/collections/all" className="link-underline font-condensed text-[11px] tracking-[0.2em] text-dept-gray-300">Seguir comprando</Link>
          </p>

          <div className="mt-5">
            <DiscountBox discountCode={cart.discountCode} discountAmount={cart.discountTotal} />
          </div>

          <dl className="font-condensed mt-5 space-y-3 text-xs tracking-[0.1em]">
            <div className="flex justify-between text-dept-gray-400">
              <dt>Subtotal</dt>
              <dd data-testid="checkout-subtotal" className="tabular-nums text-dept-white">{formatCOP(cart.subtotal)}</dd>
            </div>
            {cart.discountTotal > 0 && (
              <div className="flex justify-between text-dept-gray-400">
                <dt>Descuento{cart.discountCode ? ` (${cart.discountCode})` : ""}</dt>
                <dd data-testid="checkout-discount" className="tabular-nums text-dept-white">−{formatCOP(cart.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between text-dept-gray-400">
              <dt>Envío</dt>
              <dd data-testid="checkout-shipping" className="tabular-nums text-dept-white">
                {rate ? (rate.price === 0 ? "Gratis" : formatCOP(rate.price)) : <span className="text-dept-gray-500">Elige un envío</span>}
              </dd>
            </div>
            {!cart.taxIncluded && (
              <div className="flex justify-between text-dept-gray-400">
                <dt>IVA</dt>
                <dd className="tabular-nums text-dept-white">{formatCOP(cart.taxTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-semibold text-dept-white">
              <dt>Total{rate ? "" : " estimado"}</dt>
              <dd data-testid="checkout-total" className="text-base tabular-nums">{formatCOP(total)}</dd>
            </div>
          </dl>
          <p className="font-condensed mt-3 text-[11px] tracking-[0.1em] text-dept-gray-500">
            {cart.taxIncluded ? "Todos los precios incluyen IVA. El desglose exacto aparece en tu pedido." : "El IVA se suma al total."}
          </p>
        </div>
      </aside>
    </div>
  );
}
