"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldErrors } from "@/lib/account/client";
import { MAX_ADDRESSES } from "@/lib/account/config";
import { DEPARTMENTS } from "@/lib/account/departments";
import { describeError } from "@/lib/account/errors";
import type { CustomerAddress } from "@/lib/account/types";
import { useCustomer } from "@/lib/account/useCustomer";
import {
  addressPayload,
  addressToForm,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressForm,
  type FieldErrors,
} from "@/lib/account/validation";
import { Checkbox, Field, Notice, SelectField, Spinner, focusFirstInvalid, secondaryBtn } from "./ui";

function AddressEditor({
  initial,
  editing,
  onSaved,
  onCancel,
}: {
  initial: AddressForm;
  editing: CustomerAddress | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { request } = useCustomer();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<AddressForm>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("input,select")?.focus();
  }, []);

  const set = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const found = validateAddress(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const res = editing
      ? await request(`/me/addresses/${editing.id}`, { method: "PATCH", body: addressPayload(form) })
      : await request("/me/addresses", { method: "POST", body: addressPayload(form) });
    setBusy(false);
    if (res.ok) {
      onSaved();
      return;
    }
    const fields = fieldErrors(res.error);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      focusFirstInvalid(formRef.current);
    }
    if (res.status !== 401) setError(describeError(res.error, res.status));
  };

  return (
    <form
      ref={formRef}
      data-testid="address-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={editing ? "Editar dirección" : "Nueva dirección"}
      className="space-y-5 border border-white/15 bg-white/[0.02] p-5 sm:p-8"
    >
      <h3 className="font-display text-display-md text-dept-white">{editing ? "Editar dirección" : "Nueva dirección"}</h3>
      <Field label="Nombre completo de quien recibe" name="fullName" autoComplete="name" required value={form.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono" type="tel" name="phone" autoComplete="tel" inputMode="tel" required value={form.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
        <Field label="Etiqueta" name="label" placeholder="Casa, oficina…" maxLength={40} value={form.label} error={errors.label} hint="Opcional." onChange={(e) => set("label", e.target.value)} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Departamento" name="department" autoComplete="address-level1" required placeholder="Selecciona…" options={DEPARTMENTS} value={form.department} error={errors.department} onChange={(e) => set("department", e.target.value)} />
        <Field label="Ciudad o municipio" name="city" autoComplete="address-level2" required value={form.city} error={errors.city} onChange={(e) => set("city", e.target.value)} />
      </div>
      <Field label="Dirección" name="address1" autoComplete="address-line1" required value={form.address1} error={errors.address1} hint="Calle, carrera, número." onChange={(e) => set("address1", e.target.value)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Complemento" name="address2" autoComplete="address-line2" value={form.address2} error={errors.address2} hint="Apartamento, torre, barrio. Opcional." onChange={(e) => set("address2", e.target.value)} />
        <Field label="Código postal" name="postalCode" autoComplete="postal-code" maxLength={12} value={form.postalCode} error={errors.postalCode} hint="Opcional." onChange={(e) => set("postalCode", e.target.value)} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Tipo de documento" name="documentType" placeholder="Sin documento" options={["CC", "CE", "NIT", "PP"]} value={form.documentType} error={errors.documentType} onChange={(e) => set("documentType", e.target.value)} />
        <Field label="Número de documento" name="documentNumber" inputMode="numeric" maxLength={20} value={form.documentNumber} error={errors.documentNumber} hint="Opcional. Para la factura." onChange={(e) => set("documentNumber", e.target.value)} />
      </div>
      <Checkbox name="isDefault" checked={form.isDefault} disabled={editing?.isDefault === true} onChange={(e) => set("isDefault", e.target.checked)}>
        {editing?.isDefault ? "Esta es tu dirección predeterminada." : "Usar como dirección predeterminada."}
      </Checkbox>
      <Notice kind="error" testId="address-error">{error}</Notice>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="red" size="md" disabled={busy} data-testid="address-save">
          {busy ? "Guardando…" : "Guardar dirección"}
        </Button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AddressCard({
  address,
  busy,
  confirming,
  onEdit,
  onDefault,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  address: CustomerAddress;
  busy: boolean;
  confirming: boolean;
  onEdit: () => void;
  onDefault: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const small = "font-condensed text-[11px] tracking-[0.14em] text-dept-gray-300 underline-offset-4 hover:text-dept-white hover:underline disabled:opacity-40";
  return (
    <li data-testid="address-card" className="flex flex-col justify-between border border-white/15 bg-white/[0.02] p-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {address.label && <span className="font-condensed text-xs tracking-[0.14em] text-dept-white">{address.label}</span>}
          {address.isDefault && (
            <span data-testid="address-default-badge" className="font-condensed bg-dept-red px-2 py-0.5 text-[10px] tracking-[0.16em] text-dept-white">
              PREDETERMINADA
            </span>
          )}
        </div>
        <address className="font-condensed space-y-1 text-sm not-italic leading-relaxed tracking-[0.04em] text-dept-gray-300">
          <p className="text-dept-white">{address.fullName}</p>
          <p>{address.address1}</p>
          {address.address2 && <p>{address.address2}</p>}
          <p>
            {address.city}, {address.department}
            {address.postalCode ? ` · ${address.postalCode}` : ""}
          </p>
          <p>{address.phone}</p>
          {address.documentType && address.documentNumber && (
            <p>
              {address.documentType} {address.documentNumber}
            </p>
          )}
        </address>
      </div>
      {confirming ? (
        <div role="group" aria-label="Confirmar eliminación" className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-4">
          <span className="font-condensed text-xs tracking-[0.08em] text-dept-white">¿Eliminar esta dirección?</span>
          <button type="button" onClick={onDelete} disabled={busy} data-testid="address-confirm-delete" className="font-condensed text-[11px] tracking-[0.14em] text-dept-red-light underline underline-offset-4 disabled:opacity-40">
            Sí, eliminar
          </button>
          <button type="button" onClick={onCancelDelete} className={small}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4">
          <button type="button" onClick={onEdit} disabled={busy} data-testid="address-edit" className={small}>
            Editar
          </button>
          {!address.isDefault && (
            <button type="button" onClick={onDefault} disabled={busy} data-testid="address-make-default" className={small}>
              Hacer predeterminada
            </button>
          )}
          <button type="button" onClick={onAskDelete} disabled={busy} data-testid="address-delete" className={small}>
            Eliminar
          </button>
        </div>
      )}
    </li>
  );
}

export function AddressesPanel() {
  const { request } = useCustomer();
  const [items, setItems] = useState<CustomerAddress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ address: CustomerAddress | null } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const res = await request<{ items: CustomerAddress[] }>("/me/addresses");
    if (res.ok) {
      setItems(res.data?.items ?? []);
      setLoadError(null);
    } else if (res.status !== 401) setLoadError(describeError(res.error, res.status));
  }, [request]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const flash = (kind: "error" | "success", text: string) => setMessage({ kind, text });

  const makeDefault = async (a: CustomerAddress) => {
    setBusyId(a.id);
    setMessage(null);
    const res = await request(`/me/addresses/${a.id}`, { method: "PATCH", body: { isDefault: true } });
    setBusyId(null);
    if (res.ok) {
      await load();
      flash("success", "Dirección predeterminada actualizada.");
    } else if (res.status !== 401) flash("error", describeError(res.error, res.status));
  };

  const remove = async (a: CustomerAddress) => {
    setBusyId(a.id);
    setMessage(null);
    const res = await request(`/me/addresses/${a.id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirming(null);
    if (res.ok) {
      await load();
      flash("success", "Dirección eliminada.");
    } else if (res.status !== 401) flash("error", describeError(res.error, res.status));
  };

  const closeEditor = (saved: boolean) => {
    setEditor(null);
    if (saved) {
      void load();
      flash("success", "Dirección guardada.");
    }
    window.requestAnimationFrame(() => addButton.current?.focus());
  };

  if (items === null) {
    if (loadError) {
      return (
        <div className="space-y-4">
          <Notice kind="error" testId="addresses-load-error">{loadError}</Notice>
          <button type="button" onClick={() => void load()} className={secondaryBtn}>Reintentar</button>
        </div>
      );
    }
    return <Spinner label="Cargando tus direcciones…" />;
  }

  const full = items.length >= MAX_ADDRESSES;

  return (
    <div data-testid="addresses-page" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-display-md text-dept-white">Mis direcciones</h2>
          <p data-testid="addresses-count" className="font-condensed mt-2 text-xs tracking-[0.1em] text-dept-gray-500">
            {items.length} de {MAX_ADDRESSES} guardadas
          </p>
        </div>
        {!editor && (
          <button ref={addButton} type="button" disabled={full} data-testid="address-add" onClick={() => { setMessage(null); setEditor({ address: null }); }} className={secondaryBtn}>
            Agregar dirección
          </button>
        )}
      </div>

      {full && !editor && <Notice kind="info" testId="addresses-limit">Llegaste al máximo de {MAX_ADDRESSES} direcciones. Elimina una para agregar otra.</Notice>}
      <Notice kind={message?.kind ?? "info"} testId={message?.kind === "error" ? "addresses-error" : "addresses-success"}>{message?.text}</Notice>

      {editor && (
        <AddressEditor
          key={editor.address?.id ?? "new"}
          initial={editor.address ? addressToForm(editor.address) : { ...EMPTY_ADDRESS, isDefault: items.length === 0 }}
          editing={editor.address}
          onSaved={() => closeEditor(true)}
          onCancel={() => closeEditor(false)}
        />
      )}

      {items.length === 0 && !editor ? (
        <div className="border border-white/10 bg-white/[0.02] p-8 text-center sm:py-14" data-testid="addresses-empty">
          <p className="font-display text-display-md mb-2 text-dept-white">Aún no tienes direcciones</p>
          <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Guarda una para comprar más rápido.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              busy={busyId === a.id}
              confirming={confirming === a.id}
              onEdit={() => { setMessage(null); setEditor({ address: a }); }}
              onDefault={() => void makeDefault(a)}
              onAskDelete={() => setConfirming(a.id)}
              onCancelDelete={() => setConfirming(null)}
              onDelete={() => void remove(a)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
