"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { fieldErrors } from "@/lib/account/client";
import { describeError } from "@/lib/account/errors";
import { formatDate } from "@/lib/account/labels";
import type { CustomerProfile } from "@/lib/account/types";
import { useCustomer } from "@/lib/account/useCustomer";
import { nameError, normalizePhone, passwordError, phoneError, type FieldErrors } from "@/lib/account/validation";
import { Checkbox, Field, Notice, PasswordField, focusFirstInvalid } from "./ui";

const sectionTitle = "font-display text-display-md mb-6 text-dept-white";

function ProfileForm({ customer }: { customer: CustomerProfile }) {
  const { request, setCustomer } = useCustomer();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone ?? "",
    acceptsMarketing: customer.acceptsMarketing,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const dirty =
    form.firstName.trim() !== customer.firstName ||
    form.lastName.trim() !== customer.lastName ||
    normalizePhone(form.phone) !== (customer.phone ?? "") ||
    form.acceptsMarketing !== customer.acceptsMarketing;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const next: FieldErrors = {};
    const fn = nameError(form.firstName, "nombre");
    const ln = nameError(form.lastName, "apellido");
    const ph = phoneError(form.phone, false);
    if (fn) next.firstName = fn;
    if (ln) next.lastName = ln;
    if (ph) next.phone = ph;
    setErrors(next);
    setMessage(null);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const phone = normalizePhone(form.phone);
    const res = await request<{ customer: CustomerProfile }>("/me", {
      method: "PATCH",
      body: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: phone || null, acceptsMarketing: form.acceptsMarketing },
    });
    setBusy(false);
    if (res.ok && res.data?.customer) {
      setCustomer(res.data.customer);
      setMessage({ kind: "success", text: "Tus datos se guardaron." });
      return;
    }
    const fields = fieldErrors(res.error);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      focusFirstInvalid(formRef.current);
    }
    if (res.status !== 401) setMessage({ kind: "error", text: describeError(res.error, res.status) });
  };

  return (
    <form ref={formRef} data-testid="profile-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" name="firstName" autoComplete="given-name" required value={form.firstName} error={errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
        <Field label="Apellido" name="lastName" autoComplete="family-name" required value={form.lastName} error={errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
      </div>
      <Field label="Teléfono" type="tel" name="phone" autoComplete="tel" inputMode="tel" value={form.phone} error={errors.phone} hint="Opcional. Solo números, con + al inicio si incluye el indicativo." onChange={(e) => set("phone", e.target.value)} />
      <Checkbox name="acceptsMarketing" checked={form.acceptsMarketing} onChange={(e) => set("acceptsMarketing", e.target.checked)}>
        Quiero recibir novedades, lanzamientos y ofertas por correo.
      </Checkbox>
      <Notice kind={message?.kind ?? "info"} testId={message?.kind === "error" ? "profile-error" : "profile-success"}>{message?.text}</Notice>
      <Button type="submit" variant="red" size="md" disabled={busy || !dirty} data-testid="profile-save">
        {busy ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const { request, endSession } = useCustomer();
  const formRef = useRef<HTMLFormElement>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const found: FieldErrors = {};
    if (!current) found.current = "Escribe tu contraseña actual.";
    const pw = passwordError(next);
    if (pw) found.next = pw;
    else if (next === current) found.next = "La nueva contraseña debe ser distinta de la actual.";
    else if (confirm !== next) found.confirm = "Las contraseñas no coinciden.";
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const res = await request("/me/change-password", { method: "POST", body: { currentPassword: current, newPassword: next } });
    if (res.ok) {
      // the API closed every session (this one too): back to the login with a notice
      endSession();
      router.replace("/account/login?reset=1");
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.error?.code === "INVALID_PASSWORD") {
      setErrors({ current: "La contraseña actual no es correcta." });
      focusFirstInvalid(formRef.current);
      return;
    }
    const fields = fieldErrors(res.error);
    if (fields.newPassword) setErrors({ next: fields.newPassword });
    if (res.status !== 401) setError(describeError(res.error, res.status));
  };

  return (
    <form ref={formRef} data-testid="change-password-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <PasswordField label="Contraseña actual" name="currentPassword" autoComplete="current-password" required value={current} error={errors.current} onChange={(e) => setCurrent(e.target.value)} />
      <PasswordField label="Contraseña nueva" name="newPassword" autoComplete="new-password" required value={next} error={errors.next} hint="Mínimo 12 caracteres." meter onChange={(e) => setNext(e.target.value)} />
      <PasswordField label="Confirma la contraseña nueva" name="confirm" autoComplete="new-password" required value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
      <p className="font-condensed text-[11px] leading-relaxed tracking-[0.06em] text-dept-gray-500">
        Por seguridad cerraremos tus sesiones en todos los dispositivos y tendrás que iniciar sesión de nuevo.
      </p>
      <Notice kind="error" testId="change-password-error">{error}</Notice>
      <Button type="submit" variant="solid" size="md" disabled={busy} data-testid="change-password-submit">
        {busy ? "Actualizando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

export function ProfilePanel() {
  const { customer } = useCustomer();
  if (!customer) return null;
  return (
    <div data-testid="profile-page" className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className={sectionTitle}>Mis datos</h2>
        <dl className="font-condensed mb-8 space-y-3 border border-white/10 bg-white/[0.02] p-5 text-xs tracking-[0.08em]">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-dept-gray-500">Correo</dt>
            <dd data-testid="profile-email" className="text-dept-white break-all">{customer.email}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-dept-gray-500">Estado</dt>
            <dd className="text-dept-white">{customer.emailVerified ? "Correo verificado" : "Correo sin verificar"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-dept-gray-500">Cliente desde</dt>
            <dd className="text-dept-white">{formatDate(customer.createdAt)}</dd>
          </div>
        </dl>
        <ProfileForm customer={customer} />
      </section>
      <section aria-labelledby="password-h">
        <h2 id="password-h" className={sectionTitle}>Contraseña</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
