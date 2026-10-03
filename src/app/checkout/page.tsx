"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PendingPayment } from "@/components/checkout/PendingPayment";
import { useOverlay } from "@/components/layout/OverlayProvider";
import { Button } from "@/components/ui/Button";
import { getAccessToken, listAddresses, useAccount, type CustomerAddress } from "@/lib/account";
import { apiFetch } from "@/lib/api/client";
import { ApiError, discountReasonMessage, friendlyError } from "@/lib/api/errors";
import type { ApiCheckoutResponse, ApiShippingRate } from "@/lib/api/types";
import { clearCartError, getCartAuth, rebuildCartFrom, resetCart, useCart } from "@/lib/cart";
import { goToPayment, paymentDestination, saveLastOrder, totalsWithShipping, useLastOrder } from "@/lib/checkout";
import { formatCOP, isValidPhone, normalizePhone } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/geo";

const field = "w-full border border-white/20 bg-white/5 px-4 py-3 font-condensed text-sm text-dept-white outline-none focus:border-dept-white aria-[invalid=true]:border-dept-red";
const labelCls = "font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2";

interface Form {
  email: string; phone: string; fullName: string; department: string; city: string; address1: string; address2: string; postalCode: string;
  documentType: "" | "CC" | "CE" | "NIT" | "PP"; documentNumber: string; note: string;
}
const EMPTY: Form = { email: "", phone: "", fullName: "", department: "", city: "", address1: "", address2: "", postalCode: "", documentType: "", documentNumber: "", note: "" };

/** Orden de los campos en pantalla → id del control (para enfocar el primero inválido). */
const FIELD_ORDER: [key: string, id: string][] = [
  ["email", "co-email"], ["phone", "co-phone"], ["fullName", "co-name"], ["department", "co-dep"], ["city", "co-city"],
  ["address1", "co-addr"], ["address2", "co-addr2"], ["postalCode", "co-zip"], ["documentNumber", "co-doc"], ["rate", "co-rate"], ["note", "co-note"],
];
/** Ruta del DTO de la API → clave del formulario. */
const API_FIELD: Record<string, string> = { shippingRateId: "rate", customerNote: "note", "shippingAddress.fullName": "fullName", "shippingAddress.phone": "phone", "shippingAddress.department": "department", "shippingAddress.city": "city", "shippingAddress.address1": "address1", "shippingAddress.address2": "address2", "shippingAddress.postalCode": "postalCode", "shippingAddress.documentNumber": "documentNumber", "shippingAddress.documentType": "documentNumber" };
/** Mensajes en español por campo (la API responde en inglés). */
const FIELD_MSG: Record<string, string> = {
  email: "Introduce un correo electrónico válido", phone: "Teléfono inválido (7 a 20 dígitos)", fullName: "Indica el nombre de quien recibe", department: "Elige el departamento",
  city: "Indica la ciudad", address1: "Indica la dirección (mínimo 5 caracteres)", address2: "Complemento no válido", postalCode: "Código postal no válido",
  documentNumber: "Número de documento inválido", rate: "Elige un método de envío", note: "La nota tiene caracteres no válidos o es demasiado larga",
};

interface RatesState { key: string; rates: ApiShippingRate[]; error: boolean }

export default function CheckoutPage() {
  const router = useRouter();
  const { openCart } = useOverlay();
  const { items, quote, ready, busy, loadFailed, error: cartError, discountCode, applyDiscount, issues, invalid, savings, retry, refresh } = useCart();
  const { status: accountStatus, customer } = useAccount();
  const lastOrder = useLastOrder();
  const [form, setForm] = useState<Form>(EMPTY);
  const [chosenRate, setChosenRate] = useState("");
  const [ratesState, setRatesState] = useState<RatesState | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [saved, setSaved] = useState<CustomerAddress[]>([]);
  const [savedId, setSavedId] = useState("");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  // la misma petición repetida reutiliza la clave de idempotencia; si cambia el cuerpo, se genera otra
  const idem = useRef<{ body: string; key: string } | null>(null);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // al entrar: nada de errores de otra pantalla y cotización al día (stock / precios pueden haber cambiado)
  useEffect(() => {
    clearCartError();
    void refresh();
    return () => clearCartError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la página puede volver desde la caché de ida y vuelta (atrás desde la pasarela) con "Procesando…" congelado
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      submittingRef.current = false;
      setSubmitting(false);
      void refresh();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [refresh]);

  // cliente con sesión: precarga correo, nombre y teléfono (una vez por cliente, sin pisar lo ya escrito)
  if (customer && prefilledFor !== customer.id) {
    setPrefilledFor(customer.id);
    setForm((f) => ({ ...f, email: f.email || customer.email, phone: f.phone || customer.phone || "", fullName: f.fullName || `${customer.firstName} ${customer.lastName}`.trim() }));
  }

  // y sus direcciones guardadas (la principal se aplica sola si todavía no se escribió dirección)
  const customerId = customer?.id;
  useEffect(() => {
    if (!customerId) return;
    let off = false;
    listAddresses()
      .then((list) => {
        if (off) return;
        setSaved(list);
        const def = list.find((a) => a.isDefault);
        if (def) {
          setSavedId(def.id);
          setForm((f) => (f.address1 || f.department || f.city ? f : { ...f, ...fromAddress(def) }));
        }
      })
      .catch(() => undefined); // las direcciones guardadas son una comodidad: sin ellas se escribe a mano
    return () => {
      off = true;
    };
  }, [customerId]);

  const pickSaved = (id: string) => {
    setSavedId(id);
    const a = saved.find((x) => x.id === id);
    if (a) {
      setForm((f) => ({ ...f, ...fromAddress(a) }));
      setErrors({});
    }
  };

  // tarifas de envío según el departamento (y el contenido del carrito: gratis por umbral)
  const cartAuth = getCartAuth();
  const ratesKey = `${cartAuth?.id ?? ""}|${form.department}|${quote?.subtotal ?? 0}|${discountCode ?? ""}`;
  useEffect(() => {
    const auth = getCartAuth();
    if (!auth || !form.department) return;
    let cancelled = false;
    apiFetch<ApiShippingRate[]>("/storefront/shipping-rates", { query: { cartId: auth.id, department: form.department }, headers: { "X-Cart-Token": auth.token } })
      .then((rates) => !cancelled && setRatesState({ key: ratesKey, rates, error: false }))
      .catch(() => !cancelled && setRatesState({ key: ratesKey, rates: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [ratesKey, form.department]);

  const ratesReady = !!form.department && !!cartAuth && ratesState?.key === ratesKey;
  const rates = ratesReady ? ratesState.rates : [];
  const ratesLoading = !!form.department && !!cartAuth && !ratesReady;
  const ratesError = ratesReady && ratesState.error;
  const rateId = rates.some((r) => r.id === chosenRate) ? chosenRate : (rates[0]?.id ?? "");
  const rate = rates.find((r) => r.id === rateId);
  const totals = useMemo(() => totalsWithShipping(quote, rate?.price ?? 0), [quote, rate]);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = FIELD_MSG.email;
    if (!isValidPhone(normalizePhone(form.phone))) e.phone = FIELD_MSG.phone;
    if (form.fullName.trim().length < 2) e.fullName = FIELD_MSG.fullName;
    if (!form.department) e.department = FIELD_MSG.department;
    if (form.city.trim().length < 2) e.city = FIELD_MSG.city;
    if (form.address1.trim().length < 5) e.address1 = FIELD_MSG.address1;
    if (form.documentType && form.documentNumber.trim().length < 4) e.documentNumber = FIELD_MSG.documentNumber;
    if (!rateId) e.rate = FIELD_MSG.rate;
    return e;
  };

  /** Muestra los errores, mueve la vista al primer campo inválido y le da el foco. */
  const showErrors = (e: Record<string, string>, general: string) => {
    setErrors(e);
    setFormError(general);
    const first = FIELD_ORDER.find(([k]) => e[k]);
    window.requestAnimationFrame(() => {
      const el = first ? document.getElementById(first[1]) : formErrorRef.current;
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      if (first) (el.id === "co-rate" ? el.querySelector<HTMLElement>("input") : el)?.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (submittingRef.current) return; // doble clic: una sola petición
    const auth = getCartAuth();
    setFormError(null);
    if (!auth || items.length === 0) return showErrors({}, "Tu carrito está vacío.");
    if (invalid) return showErrors({}, "Hay productos de tu carrito que debes corregir antes de pagar (ver el resumen).");
    const e = validate();
    if (Object.keys(e).length) return showErrors(e, `Revisa los campos marcados (${Object.keys(e).length}).`);
    setErrors({});

    const phone = normalizePhone(form.phone);
    const address = {
      fullName: form.fullName.trim(), phone, department: form.department, city: form.city.trim(), address1: form.address1.trim(),
      ...(form.address2.trim() ? { address2: form.address2.trim() } : {}), ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {}),
      ...(form.documentType ? { documentType: form.documentType, documentNumber: form.documentNumber.trim() } : {}),
    };
    const body = { cartId: auth.id, email: form.email.trim(), phone, shippingAddress: address, shippingRateId: rateId, ...(form.note.trim() ? { customerNote: form.note.trim() } : {}), ...(discountCode ? { discountCode } : {}) };
    const serialized = JSON.stringify(body);
    if (idem.current?.body !== serialized) idem.current = { body: serialized, key: crypto.randomUUID() };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Con sesión se envía el token del cliente: la API todavía NO asocia el pedido a la cuenta en el checkout (pendiente de
      // backend; hoy los pedidos de invitado se vinculan por correo al verificarlo), pero la cabecera es inocua.
      const res = await apiFetch<ApiCheckoutResponse>("/storefront/checkouts", {
        method: "POST", body, token: getAccessToken(), headers: { "X-Cart-Token": auth.token, "Idempotency-Key": idem.current.key },
      });
      // el carrito local NO se vacía todavía: si el pago no llega a confirmarse, la persona puede reanudarlo o empezar de nuevo
      saveLastOrder({ orderNumber: res.orderNumber, accessToken: res.accessToken, cartId: auth.id, payment: res.payment });
      goToPayment(paymentDestination(res.payment), router.push);
    } catch (err) {
      submittingRef.current = false;
      setSubmitting(false);
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        const map: Record<string, string> = {};
        for (const path of Object.keys(err.fieldErrors())) {
          const key = API_FIELD[path] ?? path.replace(/^shippingAddress\./, "");
          if (FIELD_MSG[key]) map[key] = FIELD_MSG[key];
        }
        return showErrors(map, Object.keys(map).length ? `Revisa los campos marcados (${Object.keys(map).length}).` : friendlyError(err));
      }
      if (err instanceof ApiError && err.code === "DISCOUNT_INVALID") {
        setCodeMsg({ ok: false, text: discountReasonMessage(err.detailsObject()?.reason) });
        void applyDiscount(null);
        return showErrors({}, "Tu código de descuento ya no es válido. Lo quitamos: revisa el total e inténtalo de nuevo.");
      }
      if (err instanceof ApiError && (err.code === "CART_EXPIRED" || err.code === "NOT_FOUND")) {
        resetCart("Tu carrito expiró. Vuelve a añadir tus productos.");
        return showErrors({}, "Tu carrito expiró. Vuelve a añadir tus productos.");
      }
      if (err instanceof ApiError && (err.code === "INSUFFICIENT_STOCK" || err.code === "VARIANT_UNAVAILABLE")) void refresh(); // muestra qué línea tiene el problema
      showErrors({}, friendlyError(err, "No se pudo crear el pedido. Inténtalo de nuevo."));
    }
  };

  const applyCode = async () => {
    setCodeMsg(null);
    const c = code.trim();
    if (!c) return;
    if (await applyDiscount(c)) {
      setCodeMsg({ ok: true, text: "Código aplicado" });
      setCode("");
    } else {
      setCodeMsg({ ok: false, text: "No se pudo aplicar el código. Revisa que esté bien escrito." });
    }
  };

  const err = (k: string) => (errors[k] ? <p id={`co-${k}-err`} role="alert" className="mt-1.5 font-condensed text-[11px] tracking-[0.1em] text-dept-red-light">{errors[k]}</p> : null);
  const inv = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `co-${k}-err` : undefined }) as const;
  /** El carrito local es el que ya se convirtió en el pedido pendiente: no se puede volver a cobrar. */
  const blocked = !!lastOrder && !!cartAuth && lastOrder.cartId === cartAuth.id;
  const empty = ready && !loadFailed && items.length === 0;
  const checkoutDisabled = submitting || items.length === 0 || invalid || ratesLoading;

  return (
    <div className="min-h-[75vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-condensed mb-2 text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Proceso de compra</p>
        <h1 className="font-display text-display-xl text-dept-white mb-10">Checkout</h1>

        {lastOrder && (
          <PendingPayment
            last={lastOrder}
            blocking={blocked}
            onRestart={async () => {
              idem.current = null;
              if (blocked) await rebuildCartFrom(items.map((i) => ({ variantId: i.variantId, qty: i.qty })));
            }}
          />
        )}

        {loadFailed ? (
          <div data-testid="checkout-load-error" role="alert" className="border border-dept-red bg-dept-red/10 p-10 text-center">
            <p className="font-display text-display-md">No pudimos cargar tu carrito</p>
            <p className="mt-3 text-sm text-white/70">{cartError ?? "Revisa tu conexión e inténtalo de nuevo. Tus productos siguen guardados."}</p>
            <Button variant="red" size="lg" className="mt-8" onClick={() => void retry()} data-testid="checkout-retry">Reintentar</Button>
          </div>
        ) : empty && !blocked ? (
          <div data-testid="checkout-empty" className="border border-white/15 p-10 text-center">
            <p className="font-display text-display-md">Tu carrito está vacío</p>
            {cartError && <p role="alert" className="mt-3 text-sm text-dept-red-light">{cartError}</p>}
            <Button href="/collections/all" variant="red" size="lg" arrow className="mt-8">Ver la colección</Button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {blocked ? (
                <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Termina o descarta el pago pendiente para volver a editar tu compra.</p>
              ) : (
              <form data-testid="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                <div ref={formErrorRef} tabIndex={-1} className="outline-none">
                  {formError && <div data-testid="checkout-error" role="alert" className="border border-dept-red bg-dept-red/10 p-4 font-condensed text-xs tracking-[0.1em] text-dept-red-light">{formError}</div>}
                </div>

                <fieldset className="space-y-6"><legend className="font-display text-display-md mb-4">Contacto</legend>
                  {accountStatus === "anonymous" && <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">¿Ya tienes cuenta? <Link href="/account/login?next=/checkout" className="text-dept-white underline underline-offset-4">Inicia sesión</Link> para cargar tus datos.</p>}
                  <div><label htmlFor="co-email" className={labelCls}>Correo electrónico *</label><input id="co-email" type="email" autoComplete="email" data-testid="checkout-email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="ejemplo@correo.com" className={field} {...inv("email")} />{err("email")}</div>
                  <div><label htmlFor="co-phone" className={labelCls}>Teléfono *</label><input id="co-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="300 123 4567" className={field} {...inv("phone")} />{err("phone")}</div>
                </fieldset>

                <fieldset className="space-y-6"><legend className="font-display text-display-md mb-4">Entrega</legend>
                  {saved.length > 0 && (
                    <div><label htmlFor="co-saved" className={labelCls}>Dirección guardada</label>
                      <select id="co-saved" data-testid="checkout-saved-address" value={savedId} onChange={(e) => pickSaved(e.target.value)} className={`${field} bg-dept-black`}>
                        <option value="">Escribir otra dirección…</option>
                        {saved.map((a) => <option key={a.id} value={a.id}>{a.label ?? a.address1} · {a.city}{a.isDefault ? " (principal)" : ""}</option>)}
                      </select></div>
                  )}
                  <div><label htmlFor="co-name" className={labelCls}>Nombre de quien recibe *</label><input id="co-name" autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required className={field} {...inv("fullName")} />{err("fullName")}</div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-dep" className={labelCls}>Departamento *</label>
                      <select id="co-dep" data-testid="shipping-zone-select" value={form.department} onChange={(e) => set("department", e.target.value)} required className={`${field} bg-dept-black`} {...inv("department")}>
                        <option value="">Elegir…</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>{err("department")}</div>
                    <div><label htmlFor="co-city" className={labelCls}>Ciudad *</label><input id="co-city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} required className={field} {...inv("city")} />{err("city")}</div>
                  </div>
                  <div><label htmlFor="co-addr" className={labelCls}>Dirección *</label><input id="co-addr" data-testid="checkout-address" autoComplete="address-line1" value={form.address1} onChange={(e) => set("address1", e.target.value)} required placeholder="Calle, número" className={field} {...inv("address1")} />{err("address1")}</div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-addr2" className={labelCls}>Apartamento, torre, barrio</label><input id="co-addr2" autoComplete="address-line2" value={form.address2} onChange={(e) => set("address2", e.target.value)} className={field} {...inv("address2")} />{err("address2")}</div>
                    <div><label htmlFor="co-zip" className={labelCls}>Código postal</label><input id="co-zip" autoComplete="postal-code" maxLength={12} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={field} {...inv("postalCode")} />{err("postalCode")}</div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><label htmlFor="co-doctype" className={labelCls}>Tipo de documento</label>
                      <select id="co-doctype" value={form.documentType} onChange={(e) => set("documentType", e.target.value)} className={`${field} bg-dept-black`}><option value="">—</option><option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option><option value="PP">Pasaporte</option></select></div>
                    <div><label htmlFor="co-doc" className={labelCls}>Número de documento</label><input id="co-doc" value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} disabled={!form.documentType} className={`${field} disabled:opacity-40`} {...inv("documentNumber")} />{err("documentNumber")}</div>
                  </div>
                </fieldset>

                <fieldset id="co-rate" tabIndex={-1} className="space-y-3 outline-none"><legend className="font-display text-display-md mb-4">Envío</legend>
                  {!form.department ? <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-500">Elige el departamento para ver las tarifas.</p>
                    : ratesLoading ? <p role="status" className="font-condensed text-xs tracking-[0.1em] text-dept-gray-500">Calculando envío…</p>
                    : rates.length === 0 ? <p role="alert" className="font-condensed text-xs tracking-[0.1em] text-dept-red-light">{ratesError ? "No se pudieron cargar las tarifas. Cambia de departamento o inténtalo de nuevo." : "Por ahora no enviamos a ese departamento."}</p>
                    : rates.map((r) => (
                      <label key={r.id} className={`flex cursor-pointer items-center justify-between gap-4 border p-4 font-condensed text-xs tracking-[0.1em] ${rateId === r.id ? "border-dept-white" : "border-white/20"}`}>
                        <span className="flex items-center gap-3"><input type="radio" name="rate" value={r.id} checked={rateId === r.id} onChange={() => { setChosenRate(r.id); if (errors.rate) setErrors((x) => ({ ...x, rate: "" })); }} className="accent-[var(--dept-red)]" /><span>{r.name}{r.minDays != null ? ` · ${r.minDays === r.maxDays || r.maxDays == null ? r.minDays : `${r.minDays}–${r.maxDays}`} días` : ""}</span></span>
                        <span className="tabular-nums">{r.isFree ? "Gratis" : formatCOP(r.price)}</span>
                      </label>))}
                  {err("rate")}
                </fieldset>

                <div><label htmlFor="co-note" className={labelCls}>Nota para el pedido (opcional)</label><textarea id="co-note" rows={3} maxLength={500} value={form.note} onChange={(e) => set("note", e.target.value)} className={`${field} resize-none`} {...inv("note")} />{err("note")}</div>

                {/* código de descuento: antes del botón de pagar para que se vea también en móvil */}
                <div data-testid="discount-box" className="border-t border-white/10 pt-6">
                  <label htmlFor="co-code" className={labelCls}>Código de descuento</label>
                  <div className="flex gap-2">
                    <input id="co-code" data-testid="discount-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código de descuento" autoComplete="off" className={`${field} py-2`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCode(); } }} />
                    <Button type="button" variant="outline" onClick={() => void applyCode()} disabled={busy || !code.trim()} data-testid="discount-apply">Aplicar</Button>
                  </div>
                  <div aria-live="polite" className="mt-2 font-condensed text-xs tracking-[0.1em]">
                    {codeMsg && <p className={codeMsg.ok ? "text-dept-white/80" : "text-dept-red-light"}>{codeMsg.text}</p>}
                    {discountCode && (
                      <p className="text-dept-white/80">Código {discountCode} aplicado
                        <button type="button" data-testid="discount-remove" disabled={busy} onClick={() => { setCodeMsg(null); void applyDiscount(null); }} className="link-underline ml-3 text-dept-gray-300">Quitar</button>
                      </p>
                    )}
                  </div>
                </div>

                {invalid && (
                  <div role="alert" data-testid="checkout-invalid" className="border border-dept-red bg-dept-red/10 p-4 font-condensed text-xs leading-relaxed tracking-[0.1em] text-dept-red-light">
                    <p className="mb-2">No puedes pagar hasta corregir tu carrito:</p>
                    <ul className="list-disc space-y-1 pl-5">{issues.filter((i) => i.blocking).map((i) => <li key={`${i.code}${i.variantId}`}>{i.text}</li>)}</ul>
                    <button type="button" onClick={openCart} className="link-underline mt-3 text-dept-white">Editar carrito</button>
                  </div>
                )}

                <Button type="submit" variant="red" size="lg" data-testid="checkout-submit" disabled={checkoutDisabled} aria-disabled={checkoutDisabled} className="w-full mt-4">{submitting ? "Procesando…" : `Pagar ${totals.total > 0 ? formatCOP(totals.total) : ""}`}</Button>
                <p className="font-condensed text-[11px] tracking-[0.1em] text-dept-gray-500">Al continuar pasas a la pasarela de pago. Tu pedido queda reservado por tiempo limitado mientras pagas; si sales sin terminar, podrás reanudar el pago desde aquí.</p>
              </form>
              )}
            </div>

            <div className="lg:col-span-5">
              <div data-testid="order-summary" className="border border-white/15 bg-white/[0.02] p-6 sm:p-8 lg:sticky lg:top-[calc(var(--chrome-h)+1rem)]">
                <h2 className="font-display text-display-md text-dept-white mb-6 border-b border-white/10 pb-4">Resumen del pedido</h2>
                <div className="space-y-4 font-condensed text-xs tracking-[0.1em]">
                  {!ready ? <p className="text-dept-gray-500">Cargando…</p> : (
                    <ul className="divide-y divide-white/10 pb-4">
                      {items.map((it) => (
                        <li key={it.variantId} className="flex items-center gap-3 py-3">
                          <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-dept-gray-900">{it.image && <Image src={it.image} alt={it.name} fill sizes="44px" className="object-cover" />}</div>
                          <span className="min-w-0 flex-1">{it.handle ? <Link href={`/products/${it.handle}`} className="link-underline">{it.name}</Link> : it.name} <span className="text-dept-gray-500">· {it.size} × {it.qty}</span></span>
                          <span className="text-right tabular-nums">
                            {it.savings > 0 && it.compareAtPrice && <span className="block text-[10px] text-dept-gray-500 line-through" data-testid="line-compare">{formatCOP(it.compareAtPrice * it.qty)}</span>}
                            <span className="text-dept-white">{formatCOP(it.total)}</span>
                          </span>
                        </li>))}
                    </ul>)}

                  {!invalid && (cartError || issues.length > 0) && <p role="alert" className="text-dept-red-light">{cartError ?? issues.map((i) => i.text).join(" · ")}</p>}
                  {invalid && cartError && <p role="alert" className="text-dept-red-light">{cartError}</p>}

                  <div className="flex justify-between border-t border-white/10 pt-4 text-dept-gray-400"><span>Subtotal</span><span data-testid="checkout-subtotal" className="text-dept-white tabular-nums">{formatCOP(quote?.subtotal ?? 0)}</span></div>
                  {savings > 0 && <div className="flex justify-between text-dept-gray-400"><span>Ahorras en precios</span><span data-testid="checkout-savings" className="text-dept-white tabular-nums">{formatCOP(savings)}</span></div>}
                  {(quote?.discountTotal ?? 0) > 0 && <div className="flex justify-between text-dept-gray-400"><span>Descuento{discountCode ? ` (${discountCode})` : ""}</span><span className="text-dept-white tabular-nums">−{formatCOP(quote?.discountTotal ?? 0)}</span></div>}
                  <div className="flex justify-between text-dept-gray-400"><span>Envío</span><span className="text-dept-white tabular-nums">{rate ? (rate.isFree ? "Gratis" : formatCOP(rate.price)) : "—"}</span></div>
                  <div className="flex justify-between text-dept-gray-400"><span>{totals.taxIncluded ? "IVA incluido" : "IVA"}</span><span data-testid="checkout-tax" className="text-dept-white tabular-nums">{formatCOP(totals.tax)}</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-sm font-semibold text-dept-white"><span>Total</span><span data-testid="checkout-total" className="text-dept-white tabular-nums text-base">{formatCOP(totals.total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fromAddress = (a: CustomerAddress): Partial<Form> => ({
  fullName: a.fullName, phone: a.phone, department: DEPARTMENTS.includes(a.department as (typeof DEPARTMENTS)[number]) ? a.department : "", city: a.city, address1: a.address1,
  address2: a.address2 ?? "", postalCode: a.postalCode ?? "",
  documentType: (["CC", "CE", "NIT", "PP"] as const).find((t) => t === a.documentType) ?? "", documentNumber: a.documentNumber ?? "",
});
