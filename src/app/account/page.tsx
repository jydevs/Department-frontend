"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Loading, PASSWORD_HINT, SessionPending, ghostClass, inputClass, useRequireSession } from "@/components/account/ui";
import {
  changePassword, createAddress, deleteAddress, deleteMyAccount, exportMyData, listAddresses, logout, updateAddress, updateProfile,
  type AddressInput, type Customer, type CustomerAddress,
} from "@/lib/account";
import { ApiError, friendlyError } from "@/lib/api/errors";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/geo";

function Section({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section data-testid={testId} aria-labelledby={`${testId}-h`} className="border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <h2 id={`${testId}-h`} className="font-display text-display-md text-dept-white mb-6">{title}</h2>
      {children}
    </section>
  );
}

function Profile({ customer }: { customer: Customer }) {
  const [f, setF] = useState({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone ?? "", acceptsMarketing: customer.acceptsMarketing });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => { setF((p) => ({ ...p, [k]: v })); setMsg(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim()) return setMsg({ ok: false, text: "Nombre y apellido son obligatorios." });
    const phone = normalizePhone(f.phone);
    if (phone && !isValidPhone(phone)) return setMsg({ ok: false, text: "Teléfono no válido (7 a 20 dígitos; puedes usar espacios o guiones)." });
    setBusy(true);
    try {
      await updateProfile({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: phone || null, acceptsMarketing: f.acceptsMarketing });
      setMsg({ ok: true, text: "Perfil actualizado." });
    } catch (err) {
      setMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Perfil" testId="profile-section">
      <form onSubmit={submit} noValidate data-testid="profile-form" className="space-y-5">
        <Field label="Correo electrónico" type="email" value={customer.email} readOnly disabled hint={customer.emailVerified ? "Verificado" : "Sin verificar"} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" data-testid="profile-first-name" autoComplete="given-name" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} required />
          <Field label="Apellido" data-testid="profile-last-name" autoComplete="family-name" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} required />
        </div>
        <Field label="Teléfono" type="tel" data-testid="profile-phone" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <label className="font-condensed flex items-center gap-3 text-xs tracking-[0.08em] text-dept-gray-300">
          <input type="checkbox" checked={f.acceptsMarketing} onChange={(e) => set("acceptsMarketing", e.target.checked)} className="size-4" />
          Recibir novedades y ofertas por correo
        </label>
        {msg && <p role={msg.ok ? "status" : "alert"} data-testid="profile-msg" className={`font-condensed text-xs tracking-[0.1em] ${msg.ok ? "text-dept-white" : "text-dept-red-light"}`}>{msg.text}</p>}
        <Button type="submit" variant="red" size="md" data-testid="profile-save" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button>
      </form>
    </Section>
  );
}

/** Departamento como lista (los mismos valores que usa el checkout para calcular el envío). */
function DepartmentSelect({ value, error, onChange }: { value: string; error?: string; onChange: (v: string) => void }) {
  const id = useId();
  // una dirección guardada antes con otro texto se conserva como opción para no perderla al editar
  const extra = value && !DEPARTMENTS.includes(value as (typeof DEPARTMENTS)[number]) ? value : null;
  return (
    <div>
      <label htmlFor={id} className="font-condensed block text-xs tracking-[0.12em] text-dept-gray-300 mb-2">Departamento</label>
      <select id={id} data-testid="address-department" value={value} required onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} className={`${inputClass} bg-dept-black`}>
        <option value="">Elegir…</option>
        {extra && <option value={extra}>{extra}</option>}
        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      {error && <p id={`${id}-e`} role="alert" className="font-condensed mt-1.5 text-[11px] tracking-[0.1em] text-dept-red-light">{error}</p>}
    </div>
  );
}

const EMPTY: AddressInput = { label: "", fullName: "", phone: "", department: "", city: "", address1: "", address2: "", postalCode: "", isDefault: false };

function AddressForm({ initial, onSaved, onCancel, id }: { initial: AddressInput; id?: string; onSaved: () => void; onCancel: () => void }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof AddressInput, v: string | boolean) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.fullName.trim().length < 2) errs.fullName = "Introduce el nombre completo";
    if (!isValidPhone(normalizePhone(f.phone))) errs.phone = "Teléfono no válido (7 a 20 dígitos)";
    if (f.department.trim().length < 2) errs.department = "Elige el departamento";
    if (f.city.trim().length < 2) errs.city = "Introduce la ciudad";
    if (f.address1.trim().length < 5) errs.address1 = "Introduce la dirección (mínimo 5 caracteres)";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body: AddressInput = {
      fullName: f.fullName.trim(), phone: normalizePhone(f.phone), department: f.department.trim(), city: f.city.trim(), address1: f.address1.trim(),
      address2: f.address2?.trim() || undefined, postalCode: f.postalCode?.trim() || undefined, isDefault: !!f.isDefault,
      label: f.label?.trim() || (id ? null : undefined),
    };
    setBusy(true);
    setError(null);
    try {
      if (id) await updateAddress(id, { ...body, address2: body.address2 ?? "", postalCode: body.postalCode ?? "" });
      else await createAddress(body);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(Object.fromEntries(Object.keys(err.fieldErrors()).map((k) => [k, "Valor no válido"])));
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate data-testid="address-form" className="mt-6 space-y-5 border border-white/10 p-5">
      <FormError id="address-error">{error}</FormError>
      <Field label="Etiqueta (opcional)" data-testid="address-label" value={f.label ?? ""} maxLength={40} placeholder="Casa, Oficina…" onChange={(e) => set("label", e.target.value)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre completo" data-testid="address-full-name" autoComplete="name" value={f.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        <Field label="Teléfono" type="tel" data-testid="address-phone" autoComplete="tel" value={f.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} required />
        <DepartmentSelect value={f.department} error={errors.department} onChange={(v) => set("department", v)} />
        <Field label="Ciudad" data-testid="address-city" value={f.city} error={errors.city} onChange={(e) => set("city", e.target.value)} required />
      </div>
      <Field label="Dirección" data-testid="address-address1" autoComplete="address-line1" value={f.address1} error={errors.address1} onChange={(e) => set("address1", e.target.value)} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Complemento (opcional)" data-testid="address-address2" value={f.address2 ?? ""} error={errors.address2} onChange={(e) => set("address2", e.target.value)} />
        <Field label="Código postal (opcional)" data-testid="address-postal" maxLength={12} value={f.postalCode ?? ""} error={errors.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </div>
      <label className="font-condensed flex items-center gap-3 text-xs tracking-[0.08em] text-dept-gray-300">
        <input type="checkbox" checked={!!f.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="size-4" />
        Usar como dirección principal
      </label>
      <div className="flex gap-3">
        <Button type="submit" variant="red" size="md" data-testid="address-save" disabled={busy}>{busy ? "Guardando…" : "Guardar dirección"}</Button>
        <button type="button" onClick={onCancel} className={ghostClass}>Cancelar</button>
      </div>
    </form>
  );
}

function Addresses() {
  const [list, setList] = useState<CustomerAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    listAddresses().then((l) => { setList(l); setError(null); }).catch((e) => setError(friendlyError(e, "No se pudieron cargar tus direcciones.")));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setRemoving(true);
    try { await deleteAddress(id); setConfirming(null); load(); } catch (e) { setError(friendlyError(e)); } finally { setRemoving(false); }
  };
  const done = () => { setEditing(null); load(); };

  return (
    <Section title="Direcciones" testId="addresses-section">
      <FormError>{error}</FormError>
      {!list ? (error ? null : <Loading />) : list.length === 0 && editing !== "new" ? (
        <p className="font-condensed text-xs tracking-[0.1em] text-dept-gray-400">Aún no tienes direcciones guardadas.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="address-list">
          {list.map((a) => (
            <li key={a.id} data-testid="address-item" className="border border-white/15 p-4 text-sm text-dept-white/80">
              <p className="font-condensed text-[11px] tracking-[0.2em] text-dept-gray-500">{a.label ?? "Dirección"}{a.isDefault ? " · Principal" : ""}</p>
              <p className="mt-1 text-dept-white">{a.fullName}</p>
              <p>{a.address1}{a.address2 ? `, ${a.address2}` : ""}</p>
              <p>{a.city}, {a.department}{a.postalCode ? ` ${a.postalCode}` : ""}</p>
              <p>{a.phone}</p>
              {confirming === a.id ? (
                <div role="alertdialog" aria-label="Confirmar eliminación" data-testid="address-confirm" className="mt-3 border border-dept-red/60 p-3 font-condensed text-[11px] tracking-[0.12em]">
                  <p className="text-dept-white">¿Eliminar esta dirección?</p>
                  <div className="mt-2 flex gap-4">
                    <button type="button" autoFocus disabled={removing} onClick={() => void remove(a.id)} data-testid="address-confirm-yes" className="underline underline-offset-4 text-dept-red-light hover:text-dept-white">{removing ? "Eliminando…" : "Sí, eliminar"}</button>
                    <button type="button" disabled={removing} onClick={() => setConfirming(null)} className="underline underline-offset-4 hover:text-dept-white">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-4 font-condensed text-[11px] tracking-[0.16em]">
                  <button type="button" onClick={() => setEditing(a.id)} className="underline underline-offset-4 hover:text-dept-white">Editar</button>
                  <button type="button" onClick={() => setConfirming(a.id)} aria-label={`Eliminar dirección ${a.address1}`} data-testid="address-delete" className="underline underline-offset-4 hover:text-dept-red-light">Eliminar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === "new" && <AddressForm initial={EMPTY} onSaved={done} onCancel={() => setEditing(null)} />}
      {editing && editing !== "new" && list?.find((a) => a.id === editing) && (() => {
        const a = list.find((x) => x.id === editing)!;
        return <AddressForm key={a.id} id={a.id} onSaved={done} onCancel={() => setEditing(null)}
          initial={{ label: a.label ?? "", isDefault: a.isDefault, fullName: a.fullName, phone: a.phone, department: a.department, city: a.city, address1: a.address1, address2: a.address2 ?? "", postalCode: a.postalCode ?? "" }} />;
      })()}
      {!editing && <button type="button" data-testid="address-add" onClick={() => setEditing("new")} className={`${ghostClass} mt-6`}>Añadir dirección</button>}
    </Section>
  );
}

function Password() {
  const router = useRouter();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.current) return setError("Introduce tu contraseña actual.");
    if (f.next.length < 12) return setError("La nueva contraseña debe tener al menos 12 caracteres.");
    if (f.next !== f.confirm) return setError("Las contraseñas nuevas no coinciden.");
    setBusy(true);
    try {
      await changePassword(f.current, f.next);
      router.push("/account/login?reset=1");
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <Section title="Cambiar contraseña" testId="password-section">
      <form onSubmit={submit} noValidate data-testid="password-form" className="space-y-5">
        <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-400">Al cambiarla se cerrarán todas tus sesiones.</p>
        <FormError id="password-error">{error}</FormError>
        <Field label="Contraseña actual" type="password" autoComplete="current-password" data-testid="password-current" value={f.current} onChange={(e) => set("current", e.target.value)} required />
        <Field label="Nueva contraseña" type="password" autoComplete="new-password" data-testid="password-new" hint={PASSWORD_HINT} value={f.next} onChange={(e) => set("next", e.target.value)} required />
        <Field label="Repite la nueva contraseña" type="password" autoComplete="new-password" data-testid="password-confirm" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} required />
        <Button type="submit" variant="red" size="md" data-testid="password-save" disabled={busy}>{busy ? "Cambiando…" : "Cambiar contraseña"}</Button>
      </form>
    </Section>
  );
}

/** Habeas Data: descargar mis datos y eliminar (anonimizar) mi cuenta. */
function Privacy() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setExporting(true);
    setMsg(null);
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: "Descarga lista: guardamos tus datos en un archivo JSON." });
    } catch (e) {
      setMsg({ ok: false, text: friendlyError(e, "No se pudieron descargar tus datos. Inténtalo de nuevo.") });
    } finally {
      setExporting(false);
    }
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setDelError("Introduce tu contraseña para confirmar.");
    setBusy(true);
    setDelError(null);
    try {
      await deleteMyAccount(password);
      router.push("/account/login?deleted=1");
    } catch (err) {
      setDelError(friendlyError(err, "No se pudo eliminar la cuenta. Inténtalo de nuevo."));
      setBusy(false);
    }
  };

  return (
    <Section title="Tus datos" testId="privacy-section">
      <div className="space-y-6">
        <div>
          <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-400">Descarga una copia de toda la información personal que guardamos de ti (perfil, direcciones, pedidos y sesiones).</p>
          <button type="button" data-testid="data-export" onClick={() => void download()} disabled={exporting} className={`${ghostClass} mt-4`}>{exporting ? "Preparando…" : "Descargar mis datos"}</button>
          {msg && <p role={msg.ok ? "status" : "alert"} data-testid="data-export-msg" className={`font-condensed mt-3 text-xs tracking-[0.1em] ${msg.ok ? "text-dept-white" : "text-dept-red-light"}`}>{msg.text}</p>}
        </div>
        <div className="border-t border-white/10 pt-6">
          <p className="font-condensed text-xs tracking-[0.08em] text-dept-gray-400">Eliminar tu cuenta anonimiza tus datos personales de forma permanente y cierra todas tus sesiones. Los pedidos ya terminados pierden tus datos de contacto y entrega; los que sigan abiertos los conservan hasta cerrarse. No se puede deshacer.</p>
          {!deleting ? (
            <button type="button" data-testid="delete-account" onClick={() => setDeleting(true)} className={`${ghostClass} mt-4 hover:border-dept-red hover:bg-dept-red`}>Eliminar mi cuenta</button>
          ) : (
            <form onSubmit={remove} noValidate data-testid="delete-account-form" className="mt-4 space-y-4 border border-dept-red/60 p-5">
              <p className="font-condensed text-xs tracking-[0.1em] text-dept-white">Para confirmar, escribe tu contraseña.</p>
              <FormError id="delete-account-error">{delError}</FormError>
              <Field label="Contraseña" type="password" autoComplete="current-password" data-testid="delete-account-password" value={password} onChange={(e) => { setPassword(e.target.value); setDelError(null); }} required />
              <div className="flex gap-3">
                <Button type="submit" variant="red" size="md" data-testid="delete-account-confirm" disabled={busy}>{busy ? "Eliminando…" : "Eliminar definitivamente"}</Button>
                <button type="button" onClick={() => { setDeleting(false); setPassword(""); setDelError(null); }} className={ghostClass} disabled={busy}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { status, customer } = useRequireSession();

  return (
    <div data-testid="account-page" className="min-h-[70vh] px-gutter pt-[calc(var(--chrome-h)+2rem)] pb-20">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="font-condensed text-[11px] uppercase tracking-[0.24em] text-dept-gray-500">Mi cuenta</p>
            <h1 className="font-display text-display-lg text-dept-white mt-1" data-testid="account-greeting">{customer ? `Hola, ${customer.firstName}` : "Mi cuenta"}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/account/orders" className={ghostClass}>Mis pedidos</Link>
            {customer && <button type="button" data-testid="logout-btn" onClick={() => void logout().then(() => router.push("/account/login"))} className={ghostClass}>Cerrar sesión</button>}
          </div>
        </div>
        {status !== "authenticated" || !customer ? <SessionPending status={status} /> : (
          <div className="space-y-8">
            <Profile customer={customer} />
            <Addresses />
            <Password />
            <Privacy />
          </div>
        )}
      </div>
    </div>
  );
}
