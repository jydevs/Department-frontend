"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ApiCheckoutResponse, ApiShippingRate } from "@/lib/api/types";
import { getCartAuth, resetCart, useCart } from "@/lib/cart";
import { paymentDestination, saveLastOrder } from "@/lib/checkout";
import { formatCOP } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/geo";

const field = "w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white";
const labelCls = "font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2";
const PHONE = /^\+?[0-9]{7,20}$/;

interface Form {
  email: string; phone: string; fullName: string; department: string; city: string; address1: string; address2: string; postalCode: string;
  documentType: "" | "CC" | "CE" | "NIT" | "PP"; documentNumber: string; note: string;
}
const EMPTY: Form = { email: "", phone: "", fullName: "", department: "", city: "", address1: "", address2: "", postalCode: "", documentType: "", documentNumber: "", note: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { items, quote, ready, busy, error: cartError, discountCode, applyDiscount, warnings } = useCart();
  const [form, setForm] = useState<Form>(EMPTY);
  const [rates, setRates] = useState<ApiShippingRate[]>([]);
  const [ratesState, setRatesState] = useState<"idle" | "loading" | "error">("idle");
  const [rateId, setRateId] = useState("");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // la misma petición repetida reutiliza la clave de idempotencia; si cambia el cuerpo, se genera otra
  const idem = useRef<{ body: string; key: string } | null>(null);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // tarifas de envío según el departamento (y el contenido del carrito: gratis por umbral)
  const cartAuth = getCartAuth();
  const subtotalKey = quote?.subtotal ?? 0;
  useEffect(() => {
    const auth = getCartAuth();
    if (!auth || !form.department) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRates([]);
      setRateId("");
      return;
    }
    let cancelled = false;
    setRatesState("loading");
    apiFetch<ApiShippingRate[]>("/storefront/shipping-rates", { query: { cartId: auth.id, department: form.department }, headers: { "X-Cart-Token": auth.token } })
      .then((r) => {
        if (cancelled) return;
        setRates(r);
        setRateId((cur) => (r.some((x) => x.id === cur) ? cur : (r[0]?.id ?? "")));
        setRatesState("idle");
      })
      .catch(() => {
        if (!cancelled) {
          setRates([]);
          setRatesState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [form.department, subtotalKey, discountCode, cartAuth?.id]);

  const rate = rates.find((r) => r.id === rateId);
  const total = (quote?.total ?? 0) + (rate?.price ?? 0);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Introduce un correo electrónico válido";
    if (!PHONE.test(form.phone.trim())) e.phone = "Teléfono inválido (7 a 20 dígitos)";
    if (form.fullName.trim().length < 2) e.fullName = "Indica el nombre de quien recibe";
    if (!form.department) e.department = "Elige el departamento";
    if (form.city.trim().length < 2) e.city = "Indica la ciudad";
    if (form.address1.trim().length < 5) e.address1 = "Indica la dirección (mínimo 5 caracteres)";
    if (form.documentType && form.documentNumber.trim().length < 4) e.documentNumber = "Número de documento inválido";
    if (!rateId) e.rate = "Elige un método de envío";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const auth = getCartAuth();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (!auth || items.length === 0) return setFormError("Tu carrito está vacío.");
    if (Object.keys(e).length) return;

    const address = {
      fullName: form.fullName.trim(), phone: form.phone.trim(), department: form.department, city: form.city.trim(), address1: form.address1.trim(),
      ...(form.address2.trim() ? { address2: form.address2.trim() } : {}), ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {}),
      ...(form.documentType ? { documentType: form.documentType, documentNumber: form.documentNumber.trim() } : {}),
    };
    const body = { cartId: auth.id, email: form.email.trim(), phone: form.phone.trim(), shippingAddress: address, shippingRateId: rateId, ...(form.note.trim() ? { customerNote: form.note.trim() } : {}), ...(discountCode ? { discountCode } : {}) };
    const serialized = JSON.stringify(body);
    if (idem.current?.body !== serialized) idem.current = { body: serialized, key: crypto.randomUUID() };

    setSubmitting(true);
    try {
      const res = await apiFetch<ApiCheckoutResponse>("/storefront/checkouts", { method: "POST", body, headers: { "X-Cart-Token": auth.token, "Idempotency-Key": idem.current.key } });
      saveLastOrder({ orderNumber: res.orderNumber, accessToken: res.accessToken, reference: res.payment.reference });
      resetCart(); // el carrito ya es un pedido: no se puede reutilizar
      const dest = paymentDestination(res.payment);
      if (/^https?:\/\//.test(dest)) window.location.assign(dest);
      else router.push(dest);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        const fe = err.fieldErrors();
        const map: Record<string, string> = {};
        for (const [path, msg] of Object.entries(fe)) map[path.replace(/^shippingAddress\./, "").replace("customerNote", "note")] = msg;
        setErrors(map);
        setFormError("Revisa los campos marcados.");
      } else {
        setFormError(err instanceof ApiError ? (err.status === 429 ? "Demasiados intentos. Espera un minuto." : err.message) : "No se pudo crear el pedido.");
      }
      setSubmitting(false);
    }
  };

  const applyCode = async () => {
    setCodeMsg("");
    if (!code.trim()) return;
    if (await applyDiscount(code.trim())) {
      setCodeMsg("Código aplicado");
      setCode("");
    }
  };

  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-1.5 font-condensed text-[11px] tracking-[0.1em] text-dept-red-light">{errors[k]}</p> : null);
  const empty = ready && items.length === 0;
  const summaryLines = useMemo(() => items, [items]);

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Proceso de compra</p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Checkout</h1>

        {empty ? (
          <div data-testid="checkout-empty" className="border border-white/15 p-10 text-center">
            <p className="font-display text-display-md">Tu carrito está vacío</p>
            <Button href="/collections/all" variant="red" size="lg" arrow className="mt-8">Ver la colección</Button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <form data-testid="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                {formError && <div data-testid="checkout-error" role="alert" className="border border-dept-red bg-dept-red/10 p-4 font-condensed text-xs tracking-[0.1em] text-dept-red-light">{formError}</div>}

                <fieldset className="space-y-6"><legend className="font-display text-display-md mb-4">Contacto</legend>
                  <div><label htmlFor="co-email" className={labelCls}>Correo electrónico *</label><input id="co-email" type="email" autoComplete="email" data-testid="checkout-email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="ejemplo@correo.com" className={field} />{err("email")}</div>
                  <div><label htmlFor="co-phone" className={labelCls}>Teléfono *</label><input id="co-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="3001234567" className={field} />{err("phone")}</div>
                </fieldset>

                <fieldset className="space-y-6"><legend className="font-display text-display-md mb-4">Entrega</legend>
                  <div><label htmlFor="co-name" className={labelCls}>Nombre de quien recibe *</label><input id="co-name" autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required className={field} />{err("fullName")}</div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-dep" className={labelCls}>Departamento *</label>
                      <select id="co-dep" data-testid="shipping-zone-select" value={form.department} onChange={(e) => set("department", e.target.value)} required className={`${field} bg-dept-black`}>
                        <option value="">Elegir…</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>{err("department")}</div>
                    <div><label htmlFor="co-city" className={labelCls}>Ciudad *</label><input id="co-city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} required className={field} />{err("city")}</div>
                  </div>
                  <div><label htmlFor="co-addr" className={labelCls}>Dirección *</label><input id="co-addr" data-testid="checkout-address" autoComplete="address-line1" value={form.address1} onChange={(e) => set("address1", e.target.value)} required placeholder="Calle, número" className={field} />{err("address1")}</div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-addr2" className={labelCls}>Apartamento, torre, barrio</label><input id="co-addr2" autoComplete="address-line2" value={form.address2} onChange={(e) => set("address2", e.target.value)} className={field} /></div>
                    <div><label htmlFor="co-zip" className={labelCls}>Código postal</label><input id="co-zip" autoComplete="postal-code" maxLength={12} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={field} /></div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-doctype" className={labelCls}>Tipo de documento</label>
                      <select id="co-doctype" value={form.documentType} onChange={(e) => set("documentType", e.target.value)} className={`${field} bg-dept-black`}><option value="">—</option><option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option><option value="PP">Pasaporte</option></select></div>
                    <div><label htmlFor="co-doc" className={labelCls}>Número de documento</label><input id="co-doc" value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} disabled={!form.documentType} className={`${field} disabled:opacity-40`} />{err("documentNumber")}</div>
                  </div>
                </fieldset>

                <fieldset className="space-y-3"><legend className="font-display text-display-md mb-4">Envío</legend>
                  {!form.department ? <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-500">Elige el departamento para ver las tarifas.</p>
                    : ratesState === "loading" ? <p role="status" className="font-condensed text-xs tracking-[0.1em] text-dept-gray-500">Calculando envío…</p>
                    : rates.length === 0 ? <p role="alert" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{ratesState === "error" ? "No se pudieron cargar las tarifas." : "Por ahora no enviamos a ese departamento."}</p>
                    : rates.map((r) => (
                      <label key={r.id} className={`flex cursor-pointer items-center justify-between gap-4 border p-4 font-condensed text-xs tracking-[0.1em] ${rateId === r.id ? "border-dept-white" : "border-white/20"}`}>
                        <span className="flex items-center gap-3"><input type="radio" name="rate" value={r.id} checked={rateId === r.id} onChange={() => setRateId(r.id)} className="accent-[var(--dept-red)]" /><span>{r.name}{r.minDays != null ? ` · ${r.minDays === r.maxDays || r.maxDays == null ? r.minDays : `${r.minDays}–${r.maxDays}`} días` : ""}</span></span>
                        <span className="tabular-nums">{r.isFree ? "Gratis" : formatCOP(r.price)}</span>
                      </label>))}
                  {err("rate")}
                </fieldset>

                <div><label htmlFor="co-note" className={labelCls}>Nota para el pedido (opcional)</label><textarea id="co-note" rows={3} maxLength={500} value={form.note} onChange={(e) => set("note", e.target.value)} className={`${field} resize-none`} />{err("note")}</div>

                <Button type="submit" variant="red" size="lg" data-testid="checkout-submit" disabled={submitting || items.length === 0} className="w-full mt-4">{submitting ? "Procesando…" : `Pagar ${total > 0 ? formatCOP(total) : ""}`}</Button>
                <p className="font-condensed text-[11px] tracking-[0.1em] text-dept-gray-500">Al continuar pasas a la pasarela de pago. Tu pedido se reserva por 30 minutos.</p>
              </form>
            </div>

            <div className="lg:col-span-5">
              <div data-testid="order-summary" className="border border-white/15 bg-white/[0.02] p-6 sm:p-8 lg:sticky lg:top-[calc(var(--chrome-h)+1rem)]">
                <h2 className="font-display text-display-md text-dept-white mb-6 border-b border-white/10 pb-4">Resumen del pedido</h2>
                <div className="space-y-4 font-condensed text-xs tracking-[0.1em]">
                  {!ready ? <p className="text-dept-gray-500">Cargando…</p> : (
                    <ul className="divide-y divide-white/10 pb-4">
                      {summaryLines.map((it) => (
                        <li key={it.variantId} className="flex items-center gap-3 py-3">
                          <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-dept-gray-900">{it.image && <Image src={it.image} alt={it.name} fill sizes="44px" className="object-cover" />}</div>
                          <span className="min-w-0 flex-1">{it.handle ? <Link href={`/products/${it.handle}`} className="link-underline">{it.name}</Link> : it.name} <span className="text-dept-gray-500">· {it.size} × {it.qty}</span></span>
                          <span className="tabular-nums text-dept-white">{formatCOP(it.total)}</span>
                        </li>))}
                    </ul>)}

                  {(warnings.length > 0 || cartError) && <p role="alert" className="text-dept-red-light">{cartError ?? warnings.join(" · ")}</p>}

                  <div className="flex gap-2">
                    <label htmlFor="co-code" className="sr-only">Código de descuento</label>
                    <input id="co-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código de descuento" className={`${field} py-2`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCode(); } }} />
                    <Button type="button" variant="outline" onClick={() => void applyCode()} disabled={busy || !code.trim()}>Aplicar</Button>
                  </div>
                  {(codeMsg || discountCode) && <p className="text-dept-white/80">{codeMsg || `Código ${discountCode} aplicado`}{discountCode && <button type="button" onClick={() => void applyDiscount(null)} className="link-underline ml-3 text-dept-gray-300">Quitar</button>}</p>}

                  <div className="flex justify-between border-t border-white/10 pt-4 text-dept-gray-400"><span>Subtotal</span><span data-testid="checkout-subtotal" className="text-dept-white tabular-nums">{formatCOP(quote?.subtotal ?? 0)}</span></div>
                  {(quote?.discountTotal ?? 0) > 0 && <div className="flex justify-between text-dept-gray-400"><span>Descuento</span><span className="text-dept-white tabular-nums">−{formatCOP(quote?.discountTotal ?? 0)}</span></div>}
                  <div className="flex justify-between text-dept-gray-400"><span>Envío</span><span className="text-dept-white tabular-nums">{rate ? (rate.isFree ? "Gratis" : formatCOP(rate.price)) : "—"}</span></div>
                  <div className="flex justify-between text-dept-gray-400"><span>IVA incluido</span><span data-testid="checkout-tax" className="text-dept-white tabular-nums">{formatCOP(quote?.taxTotal ?? 0)}</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-semibold text-dept-white"><span>Total</span><span data-testid="checkout-total" className="text-dept-white tabular-nums text-base">{formatCOP(total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
